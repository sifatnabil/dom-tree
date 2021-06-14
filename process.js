const spawn = require("child_process").spawn;
const puppeteer = require("puppeteer");
const fs = require("fs");
const { PythonShell } = require("python-shell");
const {
  checkStarterWords,
  clearNames,
  isArticle,
  generateQueryString,
} = require("./utils");

// const { getLinearAr } = require("./content");

// const url =
//   "https://trialsjournal.biomedcentral.com/articles/10.1186/s13063-020-04543-4";

// const siteList = {
//   pubmed: "https://pubmed.ncbi.nlm.nih.gov",
//   trialsjournal: "https://trialsjournal.biomedcentral.com",
// };

const siteList = [
  { name: "PubMed", url: "https://pubmed.ncbi.nlm.nih.gov" },
  { name: "TrialsJournal", url: "https://trialsjournal.biomedcentral.com" },
];

const authors = ["karen voigt"];

const url = "https://pubmed.ncbi.nlm.nih.gov/31070414/";

let treeAr = [];

// * Construct a linear array from a tree.
const getLinearAr = (node) => {
  if (node.children.length > 0) {
    for (let j = 0; j < node.children.length; j++) {
      getLinearAr(node.children[j]);
    }
  }

  treeAr.push({
    nodeName: node.nodeName,
    parentName: node.parentName,
    children: node.children,
    childrenCount: node.children.length,
    content: node.content,
    nodeVal: node.nodeVal,
    nodeScore: node.nodeScore,
    nodeFont: node.nodeFont,
    nodeFontSize: node.nodeFontSize,
    nodeStyle: node.nodeStyle,
  });
};

const getTree = async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    ignoreHTTPSErrors: true,
  });
  const page = await browser.newPage();

  await page.exposeFunction("isArticle", isArticle);

  // * filter out the links
  const allLinks = [];
  for (const site of siteList) {
    const sitename = site.name;
    const url = site.url;

    const queryString = generateQueryString("karen", "voigt", sitename);

    await page.goto(queryString, { waitUntil: "networkidle0" });
    await page.waitForTimeout(5000);

    const aTags = await page.evaluate(
      (name, home) => {
        const tags = document.querySelectorAll("body a");
        const links = [];
        const linksWithText = [];
        tags.forEach((tag) => {
          const text = tag.outerText.trim();
          const link = tag.href;

          if (
            text.split(" ").length >= 4 &&
            link.includes(home) &&
            !links.includes(link)
          ) {
            linksWithText.push({
              Link: link,
              Text: text,
              Site: name,
            });
            links.push(link);
          }
        });
        return linksWithText;
      },
      sitename,
      url
    );

    allLinks.push(...aTags);
  }

  fs.writeFileSync("links", JSON.stringify(allLinks));

  console.log("Link grabbing complete");

  const links = JSON.parse(fs.readFileSync("links", "utf8"));

  for (const url of links) {
    treeAr = [];
    await page.goto(url.Link, { waitUntil: "networkidle0" });

    const tree = await page.evaluate(async () => {
      // * Look for expandable sections and click them.
      const aTags = document.querySelectorAll("a");
      aTags.forEach((tag) => {
        if (tag.outerText == "[…]") {
          tag.click();
        }
      });

      let nodeValue = 0;

      const getNodeTree = (node) => {
        if (node.hasChildNodes()) {
          let children = [];
          for (let j = 0; j < node.childNodes.length; j++) {
            const child = getNodeTree(node.childNodes[j]);
            if (child) children.push(child);
          }

          nodeValue++;
          let score = 0;
          let content = node.outerText || "";
          if (content) {
            const contentWords = content.split(" ");
            for (const word of contentWords) {
              if (word.trim()) {
                score++;
              }
            }
          }

          return {
            nodeName: node.nodeName,
            parentName: node.parentNode.nodeName,
            children: children,
            content: node.innerText || "",
            nodeVal: nodeValue,
            nodeScore: score,
            nodeFont: node.style.fontFamily,
            nodeFontSize: node.style.fontSize,
            nodeStyle: node.style,
          };
        }

        return false;
      };
      const nodes = document.querySelector("body");
      const bodyText = document.querySelector("body").outerText;

      const article = await isArticle(bodyText);
      console.log(article);

      if (article) {
        return await getNodeTree(nodes);
      }

      return "";
    });

    if (tree !== "") {
      getLinearAr(tree);
      // console.log(treeAr);

      treeAr.sort((a, b) => {
        return b.nodeScore - a.nodeScore;
      });

      // console.log(treeAr);
      // fs.writeFile("test-trialsjournal.txt", JSON.stringify(treeAr), () => {});

      const treeArlen = treeAr.length;

      const contentDiffAr = [];

      for (let i = 0; i < treeArlen - 1; i++) {
        const contentDiff = treeAr[i].nodeScore - treeAr[i + 1].nodeScore;
        contentDiffAr.push(contentDiff);
      }

      const maxContentDiffIndex = contentDiffAr.reduce(
        (bestIndexSoFar, currentlyTestedValue, currentlyTestedIndex, array) =>
          currentlyTestedValue > array[bestIndexSoFar]
            ? currentlyTestedIndex
            : bestIndexSoFar,
        0
      );

      // * Take one third of the mainContent and write it in a file for inference.
      const filename = "input-file2.txt";
      const mainContent = treeAr[maxContentDiffIndex];
      const subSectionCnt = 2; // Math.floor(mainContent.childrenCount / 3);
      let subSection = "";
      for (let i = 0; i < subSectionCnt; i++) {
        subSection += mainContent.children[i].content + " ";
      }
      fs.writeFile(filename, subSection, () => {});

      // * Call the python script and get the results back.
      const options = {
        mode: "text",
        args: [filename],
      };

      const getNames = async () => {
        const names = new Promise((resolve, reject) => {
          PythonShell.run("script.py", options, (err, res) => {
            resolve(res);
          });
        });

        const obtainedNames = await names;
        return String(obtainedNames);
      };

      const names = await getNames();
      const authornames = clearNames(names);
      console.log(authornames);

      // Todo: Experiment of abstract extraction.
      const divs = [];
      treeAr = [];
      getLinearAr(mainContent);

      for (const node of treeAr) {
        const containsStarterWord = checkStarterWords(node.content);
        if (node.nodeName === "DIV" && containsStarterWord) {
          divs.push(node.content);
        }
      }
      console.log(divs);

      // * Get Titles
      let titles = { H1: [], H2: [], H3: [] };
      for (let i = 0; i < treeAr.length; i++) {
        if (
          treeAr[i].nodeName == "H3" ||
          treeAr[i].nodeName == "H2" ||
          treeAr[i].nodeName == "H1"
        ) {
          titles[treeAr[i].nodeName].push(treeAr[i].content);
        }
      }

      let heading = "";
      if (titles.H1.length > 0) {
        heading = titles.H1[0];
      } else if (titles.H2.length > 0) {
        heading = titles.H2[0];
      } else if (titles.H3.length > 0) {
        heading = titles.H3[0];
      }

      console.log(heading);
    }
  }

  // console.log(tree);
  // fs.writeFile("test.txt", JSON.stringify(tree), () => {});

  // * Close the browser.
  await browser.close();
};

getTree();
