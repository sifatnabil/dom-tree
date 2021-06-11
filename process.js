const spawn = require("child_process").spawn;
const puppeteer = require("puppeteer");
const fs = require("fs");
const { PythonShell } = require("python-shell");

// const { getLinearAr } = require("./content");

const url =
  "https://trialsjournal.biomedcentral.com/articles/10.1186/s13063-020-04543-4";

// * Helper Functions
let treeAr = [];

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

const checkStarterWords = (content) => {
  const starterWords = ["abstract", "background", "conclusion", "methods"];

  for (const word of starterWords) {
    if (content.toLowerCase().startsWith(word)) {
      return true;
    }
  }

  return false;
};

const clearNames = (names) => {
  startIndex = names.indexOf("[");
  endIndex = names.indexOf("]");
  const nameSection = names.slice(startIndex + 1, endIndex);
  if (nameSection.length > 1) {
    const filteredListSplit = nameSection.split(",");
    const authorNames = [];
    for (const name of filteredListSplit) {
      const nameFiltered = name.replace(/'/g, "");
      authorNames.push(nameFiltered.trim());
    }
    return authorNames;
  }
  return "";
};

// * listing

text = `Abstract
The Thai Karen, the largest hill-tribe in Thailand, guard substantial ethnomedicinal plant knowledge, as documented in several studies that targeted single villages. Here, we have compiled information from all the reliable and published sources to present a comprehensive overview of the Karen ethnomedicinal plant knowledge. Our dataset covers 31 Karen villages distributed over eight provinces in Thailand. We used the Cultural Importance Index (CI) to determine which species were the most valuable to the Karen and the Informant Consensus Factor (ICF) to evaluate how well distributed the knowledge of ethnomedicinal plants was in various medicinal use categories. In the 31 Karen villages, we found 3188 reports of ethnomedicinal plant uses of 732 species in 150 plant families. Chromolaena odorata, Biancaea sappan, and Tinospora crispa were the most important medicinal plants, with the highest CI values. The Leguminosae, Asteraceae, Zingiberaceae, Euphorbiaceae, Lamiaceae, Acanthaceae, Apocynaceae, and Menispermaceae were the families with the highest CI values in the mentioned order. A high proportion of all the 3188 Karen use reports were used to treat digestive, general and unspecified, musculoskeletal, and skin disorders.`;

const getTree = async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  treeAr = [];
  await page.goto(url, { waitUntil: "networkidle0" });

  // Look for expandable sections and click them.
  await page.evaluate(() => {
    const aTags = document.querySelectorAll("a");
    aTags.forEach((tag) => {
      if (tag.outerText == "[…]") {
        tag.click();
      }
    });
  });

  // * article classification
  // const isArticle = async (text) => {
  //   const pythonProcess = spawn("python", ["./classifier.py", text]);
  //   const articleCheck = new Promise((resolve, reject) => {
  //     pythonProcess.stdout.on("data", (data) => {
  //       resolve(data.toString());
  //     });
  //   });

  //   const percentage = await articleCheck;
  //   if (parseFloat(percentage) > 0.9) {
  //     console.log("true");
  //   } else {
  //     console.log("false");
  //   }
  // };

  const tree = await page.evaluate(async () => {
    let nodeValue = 0;

    const isArticle = async (text) => {
      const pythonProcess = spawn("python", ["./classifier.py", text]);
      const articleCheck = new Promise((resolve, reject) => {
        pythonProcess.stdout.on("data", (data) => {
          resolve(data.toString());
        });
      });

      const percentage = await articleCheck;
      if (parseFloat(percentage) > 0.9) {
        return true;
      }
      return false;
    };

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
    const bodyText = document.querySelector("body");

    const article = isArticle(bodyText);

    console.log(article);

    if (article) {
      return await getNodeTree(bodyText);
    }

    return "";
  });

  // console.log(tree);
  // fs.writeFile("test.txt", JSON.stringify(tree), () => {});

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

  // * Close the browser.
  await browser.close();
};

getTree();
