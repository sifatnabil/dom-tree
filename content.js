const puppeteer = require("puppeteer");
const fs = require("fs");
const { PythonShell } = require("python-shell");

// const url =
//   "https://web.ics.purdue.edu/~gchopra/class/public/pages/webdesign/05_simple.html";

// const url = "https://pubmed.ncbi.nlm.nih.gov/28683860/";

// const url = "https://pubmed.ncbi.nlm.nih.gov/31070414/";

const url =
  "https://trialsjournal.biomedcentral.com/articles/10.1186/s13063-020-04543-4";

// const url =
//   "https://www.pubfacts.com/detail/33844180/Quality-of-primary-care-and-quality-of-life-from-the-point-of-view-of-older-patients-with-dizziness-";

// const url =
//   "https://trialsjournal.biomedcentral.com/articles/10.1186/s13063-018-2853-7";

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
