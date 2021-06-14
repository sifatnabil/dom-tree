const spawn = require("child_process").spawn;

exports.checkStarterWords = (content) => {
  const starterWords = [
    "abstract",
    "background",
    "conclusion",
    "methods",
    "results",
  ];

  for (const word of starterWords) {
    if (content.toLowerCase().startsWith(word)) {
      return true;
    }
  }

  return false;
};

exports.clearNames = (names) => {
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

  console.log(parseFloat(percentage));
  if (parseFloat(percentage) > 0.5) {
    console.log("Yes article");
    return true;
  }

  console.log("Not article");
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
