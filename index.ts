import * as fs from "fs";
import * as rp from "request-promise";
import * as cheerio from "cheerio";

const terraformBaseUrl: string = "https://ibm-cloud.github.io/tf-ibm-docs/v0.17.6";
const terraformDocHost: string = "https://ibm-cloud.github.io";

const provider = { data: {}, resource: {} };

async function process() {
  const indexPage = await rp(terraformBaseUrl);
  const $ = cheerio.load(indexPage);

  // find all data
  const categories = $(".sidebar-content .list-unstyled li").toArray();
  for (let categoryIndex = 0; categoryIndex < categories.length; categoryIndex++) {
    const currentItem = $(categories[categoryIndex]);
    const groupLabel = currentItem.children("label");
    if (groupLabel.length !== 1) {
      continue;
    }

    const groupName = groupLabel.first().text().trim();
    console.log(groupName);

    const items = currentItem.find("ul li").toArray();
    for (let index = 0; index < items.length; index++) {
      const item = $(items[index]).find("a").first();
      await processItem(groupName, groupName.indexOf(" Resources") === - 1, item);
    }
  };

  fs.writeFile("terraform-provider-ibm.json", JSON.stringify(provider, null, 2), (err) => {
    if (err) {
      console.log(err);
    } else {
      console.log("File successfully written");
    }
  });
}

function extractParameters($: CheerioStatic, args) {
  // <li><code class="prettyprint">name</code> -
  // (Required, string) The name of the application.
  // You can retrieve the value by running the 
  // <code class="prettyprint">ibmcloud app list</code> command in
  // the <a href="https://cloud.ibm.com/docs/cli?topic=cloud-cli-getting-started">IBM Cloud CLI</a>
  //.</li>

  const params = [];

  args.each((i, e) => {
    const argElement = $(e);
    const argName = argElement.find("code").first().text().trim();
    const argText = argElement.text().trim();
    const argDescription = argText.substring(argText.indexOf("-") + 1).trim();

    const arg = {
      name: argName,
      description: argDescription,
      args: []
    };
    params.push(arg);

    if (argDescription.indexOf("blocks have the following structure") > 0) {
      const nestedParams = argElement.find("ul");
      if (nestedParams.length > 0) {
        arg.args = extractParameters($, nestedParams.children());
      }
    }
  });

  return params;
}
async function processItem(groupName: string, isData: boolean, item: Cheerio) {
  const itemName = `ibm_${item.text().trim()}`;
  const itemDocUrl = `${terraformDocHost}${item.attr("href")}`;
  console.log("  ", itemName, itemDocUrl);

  const itemResult = {
    name: itemName,
    type: isData ? "data" : "resource",
    url: itemDocUrl,
    groupName,
    args: [],
    attrs: []
  };

  const itemPage = await rp(itemDocUrl);
  const $ = cheerio.load(itemPage);


  const argumentReference = $("#argument-reference").first();
  itemResult.args = extractParameters($, $(argumentReference).next().next().children());

  const attrReference = $("#attribute-reference").first();
  itemResult.attrs = extractParameters($, $(attrReference).next().next().children());

  if (isData) {
    provider.data[itemResult.name] = itemResult;
  } else {
    provider.resource[itemResult.name] = itemResult;
  }
}

process();
