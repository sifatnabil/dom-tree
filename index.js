const puppeteer = require("puppeteer");
const fs = require("fs");

const url =
  "https://web.ics.purdue.edu/~gchopra/class/public/pages/webdesign/05_simple.html";

// const url = "https://pubmed.ncbi.nlm.nih.gov/28683860/";
const treeAr = [];

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
          score = contentWords.length;
        }

        return {
          nodeName: node.nodeName,
          parentName: node.parentNode.nodeName,
          children: children,
          content: node.outerText || "",
          nodeVal: nodeValue,
          nodeScore: score,
        };
      }

      return false;
    };
    const bodyText = document.querySelector("body");

    const nodeTree = await getNodeTree(bodyText);

    return nodeTree;
  });

  // console.log(tree);

  // const optimedNodeContent = optimizedValue(tree, true);
  // console.log(optimedNodeContent);

  getLinearAr(tree);
  // console.log(treeAr);

  treeAr.sort((a, b) => {
    return b.nodeScore - a.nodeScore;
  });

  console.log("Sorting based on node score Descending");

  console.log(treeAr);

  treeAr.sort((a, b) => {
    return a.children - b.children;
  });

  console.log("Sorting based on no of children Ascending");

  console.log(treeAr);

  await browser.close();
};

getTree();
