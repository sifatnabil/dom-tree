const puppeteer = require("puppeteer");
const fs = require("fs");
const {
  generateQueryString,
  getMainContent,
  isArticle,
  getAuthorNames,
  getHeading,
  getAbstract,
} = require("./utils");

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
    headless: true,
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
      // * Find out the main portion of a page.
      getLinearAr(tree);

      treeAr.sort((a, b) => {
        return b.nodeScore - a.nodeScore;
      });

      const mainContent = getMainContent(treeAr);

      // * Send first three child of mainContent to find out co-authors.
      const filename = "input-file2.txt";
      const subSectionCnt = 2;
      const authors = await getAuthorNames(
        filename,
        subSectionCnt,
        mainContent
      );

      console.log(authors);

      // * Abstract Extraction
      treeAr = [];
      getLinearAr(mainContent);
      const divs = await getAbstract(treeAr);
      console.log(`Article Abstract is: `);
      console.log(divs);

      // * Get Titles
      const heading = getHeading(treeAr);
      console.log(`Title of the Article: ${heading}`);
    }
  }

  // * Close the browser.
  await browser.close();
};

getTree();
