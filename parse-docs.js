const fs = require('fs');
const conref = require('./conref');

const docDirectory = './provider-docs/provider';

const data = {};
const resource = {};

const files = fs.readdirSync(docDirectory).filter((file) => file.indexOf('sources') > 0);
files.forEach((file) => {
  
  let currentGroup;
  let currentItem;
  const isData = file.indexOf('data-sources') > 0;
  const doc = fs.readFileSync(`${docDirectory}/${file}`).toString();
  const lines = doc.split('\n');

  let inComments = false;

  lines.forEach((line) => {
    line = line.trimRight();

    if (line.trim().startsWith('```')) {
      inComments = !inComments;
    }

    if (inComments) {
      return;
    }

    const isH1 = line.match(/^#(?!#)/gm);
    const isH2 = line.match(/^##(?!#)/gm);

    if (!currentGroup && isH1) {
      currentGroup = conref(line.substring(1).trim());
      console.log(`>>> ${currentGroup}`);
    }
    
    if (isH2) {
      currentItem = {
        name: line.substring(2).trim().replace(/`/g, ''),
        type: isData ? 'data' : 'resource',
        url: 'https://cloud.ibm.com/docs/terraform?topic=terraform-provider-changelog',
        groupName: currentGroup,
        args: [],
        attrs: [],
      }
      if (currentItem.type === 'data') {
        data[currentItem.name] = currentItem;
      } else {
        resource[currentItem.name] = currentItem;
      }
      console.log(`   ${currentItem.name}`);
    }

    line = line.trim();

    if (line.replace(/ /g, '').indexOf('|Description|') >= 0 ||
        line.replace(/ /g, '').indexOf('|---') >= 0) {
      // entering parameters
      return;
    }

    // |`certificate_manager_instance_id`|String|Required|The CRN-based service instance ID.|
    const isInputParam = line.match(/^\|[^!]*\|[^!]*\|[^!]*\|[^!]*\|$/gm);

    // |`id`|String|The unique identifier of the {{site.data.keyword.cloud_notm}} account.  |
    const isOutputParam = line.match(/^\|[^!]*\|[^!]*\|[^!]*\|$/gm);

    if (isInputParam) {
      const values = line.substring(1).split('|');
      const param = {
        name: values[0].trim().replace(/`/g, ''),
        description: `(${values[2].trim()}, ${values[1].trim()}) ${conref(values[3].trim())}`,
        args: [],
      };

      resolveNestedParam(currentItem, currentItem.args, param);
    } else if (isOutputParam) {
      const values = line.substring(1).split('|');
      const param = {
        name: values[0].trim().replace(/`/g, ''),
        description: conref(values[2].trim()),
        args: [],
      };

      resolveNestedParam(currentItem, currentItem.attrs, param);
    }
  });
});

function resolveNestedParam(item, itemChildren, param) {
  // console.log('resolve nested for', param.name);
  const dotIndex = param.name.indexOf('.');
  if (dotIndex >= 0) {
    const parentName = param.name.substring(0, dotIndex);
    // console.log('resolve nested', item.name, param.name, parentName);
    const parent = itemChildren.find((value, index) => {
      return value.name == parentName;
    });

    param.name = param.name.substring(dotIndex + 1);

    console.log(`      ${parentName} -> ${param.name}`);
    if (param.name.indexOf('.') >= 0) {
      resolveNestedParam(parent, parent.args, param);
    } else {
      parent.args.push(param);
    }
  } else {
    console.log(`      ${param.name}`);
    itemChildren.push(param);
  }
}

const provider = {
  data: {},
  resource: {},
};

Object.keys(data).sort().forEach(function(key) {
  provider.data[key] = data[key];
});
Object.keys(resource).sort().forEach(function(key) {
  provider.resource[key] = resource[key];
});

fs.writeFileSync("terraform-provider-ibm.json", JSON.stringify(provider, null, 2));
