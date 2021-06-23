const spawn = require("child_process").spawn;
const { PythonShell } = require("python-shell");
const fs = require("fs");

const checkStarterWords = (content) => {
  const starterWords = [
    "abstract",
    "background",
    "conclusion",
    "methods",
    "results",
    "introductions",
    "objective",
  ];

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

exports.isArticle = async (text) => {
  const pythonProcess = spawn("python", ["./classifier.py", text]);
  const articleCheck = new Promise((resolve, reject) => {
    pythonProcess.stdout.on("data", (data) => {
      resolve(data.toString());
    });
  });

  const percentage = await articleCheck;

  if (parseFloat(percentage) > 0.5) {
    console.log(`It's an article with a score of: ${parseFloat(percentage)}`);
    return true;
  }

  console.log(`It's not an article with a score of: ${parseFloat(percentage)}`);
  return false;
};

exports.generateQueryString = (firstname, lastname, site) => {
  const firstnameWords = firstname.split(" ");
  const lastnameWords = lastname.split(" ");

  let nameStr = "";

  firstnameWords.map((word) => (nameStr += word + "+"));
  lastnameWords.map((word) => (nameStr += word + "+"));
  let queryString = "";
  switch (site) {
    case "PubMed":
      queryString = `https://pubmed.ncbi.nlm.nih.gov/?term=${nameStr}`;
      break;

    case "PubFacts":
      queryString = `https://www.pubfacts.com/search/${nameStr}`;
      break;

    case "TrialsJournal":
      queryString = `https://trialsjournal.biomedcentral.com/articles?query=${firstname}+${lastname}&volume=&searchType=&tab=keyword`;
      break;

    case "PubPharm":
      queryString = `https://www.pubpharm.de/vufind/Search/Results?lookfor=${firstname}&limit=10&type=AllFields`;
      break;
  }

  return queryString;
};

exports.getMainContent = (treeAr) => {
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

  return treeAr[maxContentDiffIndex];
};

exports.getAuthorNames = async (filename, subSectionCnt, mainContent) => {
  const options = {
    mode: "text",
    args: [filename],
  };

  let authors = [];
  if (mainContent.childrenCount > 0) {
    for (let i = 0; i < subSectionCnt && i < mainContent.childrenCount; i++) {
      const subSection = mainContent.children[i].content || "";
      fs.writeFile(filename, subSection, () => {});

      const names = new Promise((resolve, reject) => {
        PythonShell.run("script.py", options, (err, res) => {
          resolve(res);
        });
      });

      const obtainedNames = await names;
      const authornames = clearNames(String(obtainedNames));

      authors = authornames.length > authors.length ? authornames : authors;
    }
  }

  return authors;
};

exports.getHeading = (treeAr) => {
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

  return heading;
};

exports.getAbstract = async (treeAr) => {
  const divs = [];

  for (const node of treeAr) {
    const containsStarterWord = checkStarterWords(node.content);
    if (node.nodeName === "DIV" && containsStarterWord) {
      divs.push(node.content);
    }
  }

  let abstract = "";
  let score = -1;

  for (const div of divs) {
    const options = {
      mode: "text",
      args: [div],
    };

    const isAbstract = new Promise((resolve, reject) => {
      PythonShell.run("bert_classifier.py", options, (err, res) => {
        resolve(res);
      });
    });

    const abstractClf = await isAbstract;
    const classifierLabel = abstractClf[1];
    const classifierScore = abstractClf[0];

    // console.log(abstractClf);

    if (classifierLabel == "abstract" && classifierScore > score) {
      score = classifierScore;
      abstract = div;
    }
  }
  return abstract;
};
