const puppeteer = require("puppeteer");
const fs = require("fs");

// const url =
//   "https://web.ics.purdue.edu/~gchopra/class/public/pages/webdesign/05_simple.html";

const url = "https://pubmed.ncbi.nlm.nih.gov/28683860/";

const getTree = async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(url, { waitUntil: "networkidle0" });

  const tree = await page.evaluate(async () => {
    let nodeValue = 0;
    const getNodeTree = (node) => {
      if (node.hasChildNodes()) {
        var children = [];
        for (var j = 0; j < node.childNodes.length; j++) {
          children.push(getNodeTree(node.childNodes[j]));
        }

        nodeValue++;
        let score;
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

  console.log(tree);

  await browser.close();
};

getTree();
