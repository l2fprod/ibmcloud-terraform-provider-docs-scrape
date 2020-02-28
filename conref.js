function doReplacements(text) {
  let processed = text;
  Object.keys(replacements).forEach(key => {
    processed = processed.replace(new RegExp(key, 'g'), replacements[key]);
  });
  return processed;
}

const conref = require('read-yaml').sync('./cloudoeconrefs.yml');
const replacements = {};
Object.keys(conref.keyword).forEach(key => {
  replacements[`{{site.data.keyword.${key}}}`] = conref.keyword[key];
});
// ignore all {: #header}, {:tip}, etc.
replacements['{:(.*)}'] = '';

module.exports = doReplacements;
