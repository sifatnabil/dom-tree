const data = [
  { id: 56, parentId: 62 },
  { id: 81, parentId: 80 },
  { id: 74, parentId: null },
  { id: 76, parentId: 80 },
  { id: 63, parentId: 62 },
  { id: 80, parentId: 86 },
  { id: 87, parentId: 86 },
  { id: 62, parentId: 74 },
  { id: 86, parentId: 74 },
];

const idMapping = data.reduce((acc, el, i) => {
  acc[el.id] = i;
  return acc;
}, {});

let root;

data.forEach((el) => {
  if (el.parentId === null) {
    root = el;
    return;
  }

  const parentEl = data[idMapping[el.parentId]];

  parentEl.children = [...(parentEl.children || []), el];
});

console.log(root);

/* */
function getNodeTree(node) {
  if (node.hasChildNodes()) {
    var children = [];
    for (var j = 0; j < node.childNodes.length; j++) {
      children.push(getNodeTree(node.childNodes[j]));
    }

    return {
      nodeName: node.nodeName,
      parentName: node.parentNode.nodeName,
      children: children,
      content: node.innerText || "",
    };
  }

  return false;
}
