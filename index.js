const puppeteer = require("puppeteer");
const fs = require("fs");
const { spawn } = require("child_process");

// const url =
//   "https://web.ics.purdue.edu/~gchopra/class/public/pages/webdesign/05_simple.html";

// const url = "https://pubmed.ncbi.nlm.nih.gov/28683860/";

// const url =
//   "https://www.pubfacts.com/detail/33844180/Quality-of-primary-care-and-quality-of-life-from-the-point-of-view-of-older-patients-with-dizziness-";

const url =
  "https://trialsjournal.biomedcentral.com/articles/10.1186/s13063-018-2853-7";
let treeAr = [];
const mainArticleList = [];

const threshold = 300;
const siteList = [
  "https://pubmed.ncbi.nlm.nih.gov/24204642",
  "https://pubmed.ncbi.nlm.nih.gov/25907703",
  "https://pubmed.ncbi.nlm.nih.gov/27590181",
  "https://pubmed.ncbi.nlm.nih.gov/28143799",
  "https://pubmed.ncbi.nlm.nih.gov/29769577",
  "https://pubmed.ncbi.nlm.nih.gov/31930323",
  "https://pubmed.ncbi.nlm.nih.gov/31930323",
  "https://pubmed.ncbi.nlm.nih.gov/32378801",
  "https://pubmed.ncbi.nlm.nih.gov/32512530",
  "https://pubmed.ncbi.nlm.nih.gov/32853038",
  "https://pubmed.ncbi.nlm.nih.gov/32868092",
  "https://pubmed.ncbi.nlm.nih.gov/32924089",
  "https://pubmed.ncbi.nlm.nih.gov/33085084",
  "https://pubmed.ncbi.nlm.nih.gov/33130203",
  "https://pubmed.ncbi.nlm.nih.gov/33139015",
  "https://pubmed.ncbi.nlm.nih.gov/33537331",
];

const getLinearAr = (node) => {
  if (node.children.length > 0) {
    for (let j = 0; j < node.children.length; j++) {
      getLinearAr(node.children[j]);
    }
  }

  treeAr.push({
    nodeName: node.nodeName,
    parentName: node.parentName,
    children: node.children.length,
    content: node.content,
    nodeVal: node.nodeVal,
    nodeScore: node.nodeScore,
    nodeFont: node.nodeFont,
    nodeFontSize: node.nodeFontSize,
    nodeStyle: node.nodeStyle,
  });
};

const optimizedValue = (node, isMax) => {
  if (node.children.length == 0) {
    return node.nodeScore;
  }

  let scores = [];
  if (isMax) {
    for (let j = 0; j < node.children.length; j++) {
      scores.push(optimizedValue(node.children[j]), false);
    }

    return Math.max(...scores);
  } else {
    for (let j = 0; j < node.children.length; j++) {
      scores.push(optimizedValue(node.children[j]), true);
    }

    return Math.min(...scores);
  }
};

const getTree = async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  treeAr = [];
  await page.goto(url, { waitUntil: "networkidle0" });

  const tree = await page.evaluate(async () => {
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
    const bodyText = document.querySelector("body");

    const nodeTree = await getNodeTree(bodyText);

    return nodeTree;
  });

  // console.log(tree);
  fs.writeFile("test.txt", JSON.stringify(tree), () => {});

  getLinearAr(tree);
  // // console.log(treeAr);

  treeAr.sort((a, b) => {
    return b.nodeScore - a.nodeScore;
  });

  // // console.log(treeAr);
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

  const filename = "input-file.txt";

  // console.log(contentDiffAr);
  const mainContent = treeAr[maxContentDiffIndex];
  fs.writeFile(filename, mainContent.content, () => {});

  // example1 = "My name is Wolfgang and I live in Berlin";

  const childPython = spawn("python", ["script.py", filename]);

  childPython.stdout.on("data", (data) => {
    console.log(`${data}`);
  });

  await browser.close();
};

getTree();

// getTree(url);
