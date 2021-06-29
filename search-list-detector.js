const puppeteer = require("puppeteer");
const fs = require("fs");

const url = "https://pubmed.ncbi.nlm.nih.gov/?term=karen";

function convert(data) {
  var myMap = {};
  data.forEach(
    (el) => (myMap[el] = myMap[el] != undefined ? myMap[el] + 1 : 1)
  );
  return myMap;
}

function convert_reverse(data) {
  var myMap = {};
  Object.keys(data).forEach(
    (el) =>
      (myMap[data[el]] =
        myMap[data[el]] != undefined ? [...myMap[data[el]], el] : [el])
  );
  return Object.keys(myMap).map((k) => {
    return { count: k, classes: myMap[k] };
  });
}
const getListPattern = async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    ignoreHTTPSErrors: true,
  });
  const page = await browser.newPage();
  await page.goto(url);
  await page.waitForTimeout(3000);

  const classElements = await page.evaluate(() => {
    return [].concat(
      ...[...document.querySelectorAll("*")].map((elt) => [...elt.classList])
    );
  });

  var freqToClass = convert_reverse(convert(classElements));
  fs.writeFileSync(
    "frequency to classes.txt",
    JSON.stringify(convert_reverse(convert(classElements)))
  );
  freqToClass.map((obj) => console.log(`${obj.count} : ${obj.classes.length}`));
  await browser.close();
};
getListPattern();
