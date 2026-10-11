const fs = require("fs");
const path = require("path");
const parser = require("./client/node_modules/@babel/parser");
const traverse = require("./client/node_modules/@babel/traverse").default;

const files = [
  "client/src/main.jsx",
  "client/src/UserDetails.jsx",
  "client/src/FarmDetails.jsx",
  "client/src/FarmOverview.jsx",
  "mobile/src/ui.tsx",
  ...fs
    .readdirSync("mobile/src/screens")
    .filter((x) => x.endsWith(".tsx"))
    .map((x) => "mobile/src/screens/" + x),
];
for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  const ast = parser.parse(source, {
    sourceType: "module",
    plugins: ["jsx", "typescript"],
  });
  const edits = [];
  const functions = new Set();
  function owner(p) {
    while (p && !p.isFunctionDeclaration()) p = p.parentPath;
    return p;
  }
  function replace(p, value) {
    const fn = owner(p);
    if (!fn) return;
    functions.add(fn.node);
    edits.push({ start: p.node.start, end: p.node.end, value });
  }
  const attrs = new Set([
    "title",
    "placeholder",
    "aria-label",
    "accessibilityLabel",
    "alt",
  ]);
  const names = new Set([
    "label",
    "title",
    "subtitle",
    "description",
    "text",
    "photoTip",
    "consentText",
    "consentDetail",
    "command",
    "tip",
  ]);
  traverse(ast, {
    JSXText(p) {
      const text = p.node.value.replace(/\s+/g, " ").trim();
      if (/[a-zA-Z]/.test(text))
        replace(p, "{localize(" + JSON.stringify(text) + ")}");
    },
    JSXAttribute(p) {
      if (!attrs.has(p.node.name.name) || !p.node.value) return;
      if (p.node.value.type === "StringLiteral")
        replace(
          p.get("value"),
          "{localize(" + JSON.stringify(p.node.value.value) + ")}",
        );
      else if (p.node.value.type === "JSXExpressionContainer") {
        const e = p.node.value.expression;
        replace(
          p.get("value"),
          "{localize(" + source.slice(e.start, e.end) + ")}",
        );
        p.skip();
      }
    },
    JSXExpressionContainer(p) {
      if (p.parentPath.isJSXAttribute()) return;
      const e = p.node.expression;
      const raw = source.slice(e.start, e.end);
      if (
        (e.type === "Identifier" && names.has(e.name)) ||
        (e.type === "MemberExpression" &&
          (e.object.name === "screens" ||
            ["label", "title", "subtitle", "tagline"].includes(
              e.property.name,
            ))) ||
        (e.type === "CallExpression" &&
          ["analysisStatus", "accountGreeting"].includes(e.callee.name)) ||
        (e.type === "ConditionalExpression" &&
          !raw.includes("<") &&
          (e.consequent.type === "StringLiteral" ||
            e.alternate.type === "StringLiteral"))
      ) {
        replace(p, "{localize(" + raw + ")}");
        p.skip();
      }
    },
  });
  const mobile = file.startsWith("mobile");
  for (const fn of functions) {
    const isApp = !mobile && fn.id.name === "App";
    edits.push({
      start: fn.body.start + 1,
      end: fn.body.start + 1,
      value:
        "\n  const localize = " +
        (isApp ? "text => translate(lang, text)" : "useLocale()") +
        ";",
    });
    if (isApp) {
      const ret = fn.body.body.find((x) => x.type === "ReturnStatement");
      edits.push({
        start: ret.argument.start,
        end: ret.argument.start,
        value: "<LocaleContext.Provider value={lang}>",
      });
      edits.push({
        start: ret.argument.end,
        end: ret.argument.end,
        value: "</LocaleContext.Provider>",
      });
    }
  }
  const importPath = mobile
    ? file.includes("/screens/")
      ? "../locale"
      : "./locale"
    : "./locale";
  let result = source;
  for (const edit of edits.sort((a, b) => b.start - a.start))
    result = result.slice(0, edit.start) + edit.value + result.slice(edit.end);
  result =
    "import { useLocale" +
    (!mobile && file.endsWith("main.jsx") ? ", LocaleContext" : "") +
    " } from " +
    JSON.stringify(importPath) +
    ";\n" +
    result;
  if (file.endsWith("main.jsx"))
    result =
      "import { normalizeLanguage, translate } from '../../common/locale.js';\n" +
      result;
  fs.writeFileSync(file, result);
}
