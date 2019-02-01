// this script rebuilds the icon fonts from svg sources
// it accepts a master config json which describes the
// icons including unicode character, classname,
// category and title.

const fs = require('fs');
const path = require('path');
const webfont = require('webfont').default;

const workingDirectory = './';
const categoriesJsonFile = './src/categories.json';
const svgDirectory = './src/svgs';
const outputDirectory = './dist';
const outputTypescriptDirectory = './dist/typescript';
const outputMobileDirectory = './dist/mobile';

const categoriesJson = JSON.parse(fs.readFileSync(categoriesJsonFile, 'utf-8'));

const files = path.join(svgDirectory, '**/*.svg');
const buildDirectory = path.join(workingDirectory, '.build');

// check we can access the location
if (!fs.existsSync(svgDirectory)) {
  console.error('svg directory does not exist');
  process.exit(101);
}

console.log('starting webfont processing...');
webfont({
  files,
  fontName: 'alloyicons',
  template: 'css',
  templateClassName: 'icon',
})
  .then((result) => {
    console.log('webfonts processed!');

    // result object looks like:
    // svg: svg data (string)
    // glyphsData: each glyph loaded from the original svg files including meta data
    // ttf: ttf file (buffer)
    // eot: eot file (buffer)
    // woff: woff file (buffer)
    // woff2: woff2 file (buffer)
    // usedBuildInTemplate: whether the built in template is used
    // template: the template being executed
    // config: the config passed to the underlying library

    const svgOutputFile = path.join(buildDirectory, 'alloyicons.svg');
    const ttfOutputFile = path.join(buildDirectory, 'alloyicons.ttf');
    const eotOutputFile = path.join(buildDirectory, 'alloyicons.eot');
    const woffOutputFile = path.join(buildDirectory, 'alloyicons.woff');
    const woff2OutputFile = path.join(buildDirectory, 'alloyicons.woff2');
    const cssOutputFile = path.join(buildDirectory, 'alloyicons.css');

    // clean the build directory if we have one
    if (fs.existsSync(buildDirectory)) {
      console.log('cleaning build directory...');
      rimraf(buildDirectory);
    }
    fs.mkdirSync(buildDirectory);

    console.log('saving webfont files...');
    fs.writeFileSync(svgOutputFile, result.svg);
    fs.writeFileSync(ttfOutputFile, result.ttf);
    fs.writeFileSync(eotOutputFile, result.eot);
    fs.writeFileSync(woffOutputFile, result.woff);
    fs.writeFileSync(woff2OutputFile, result.woff2);
    // save css, replacing 4 spaces with 2
    fs.writeFileSync(cssOutputFile, result.template.replace(/    /g, '  '));

    console.log('creating index.html...');
    const indexOutputFile = path.join(buildDirectory, 'index.html');
    generateIndex(result.glyphsData, indexOutputFile);

    console.log('creating icons.json...');
    const iconsJsonFile = path.join(buildDirectory, 'icons.json');
    generateIconsJson(result.glyphsData, iconsJsonFile);

    console.log('creating IconUtils.ts...');
    const iconUtilsOutputFile = path.join(buildDirectory, 'IconUtils.ts');
    const iconUtilsOutputFileIndex = path.join(buildDirectory, 'index.ts');
    generateIconUtils(result.glyphsData, iconUtilsOutputFile, iconUtilsOutputFileIndex);

    // clean the output directories if we have one
    if (fs.existsSync(outputDirectory)) {
      console.log('cleaning output directory...');
      rimraf(outputDirectory);
    }
    fs.mkdirSync(outputDirectory);

    console.log('copying build dir to output dir...');
    fs.copyFileSync(svgOutputFile, path.join(outputDirectory, path.basename(svgOutputFile)));
    fs.copyFileSync(ttfOutputFile, path.join(outputDirectory, path.basename(ttfOutputFile)));
    fs.copyFileSync(eotOutputFile, path.join(outputDirectory, path.basename(eotOutputFile)));
    fs.copyFileSync(woffOutputFile, path.join(outputDirectory, path.basename(woffOutputFile)));
    fs.copyFileSync(woff2OutputFile, path.join(outputDirectory, path.basename(woff2OutputFile)));
    fs.copyFileSync(cssOutputFile, path.join(outputDirectory, path.basename(cssOutputFile)));
    fs.copyFileSync(indexOutputFile, path.join(outputDirectory, path.basename(indexOutputFile)));

    // mobile
    fs.mkdirSync(outputMobileDirectory);
    fs.copyFileSync(iconsJsonFile, path.join(outputMobileDirectory, path.basename(iconsJsonFile)));

    // typescript
    fs.mkdirSync(outputTypescriptDirectory);
    fs.copyFileSync(
      iconUtilsOutputFile,
      path.join(outputTypescriptDirectory, path.basename(iconUtilsOutputFile)),
    );
    fs.copyFileSync(
      iconUtilsOutputFileIndex,
      path.join(outputTypescriptDirectory, path.basename(iconUtilsOutputFileIndex)),
    );

    console.log('alloy icons generated!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('failed to process webfonts', error);
    process.exit(101);
  });

function generateIndex(glyphs, indexOutputFile) {
  const content = glyphs
    .map((g) => {
      return `<div class="icon">
      <span class="icon-${g.metadata.name}"></span>
      <h2>icon-${g.metadata.name}</h2>
      <p><code>${g.metadata.name}.svg</code></p>
      <p>unicode: <code>#${g.metadata.unicode[0].charCodeAt(0)}</code></p>
    </div>`;
    })
    .join('\n');

  fs.writeFileSync(
    indexOutputFile,
    `<html>
    <head>
      <title>Alloy Icons</title>
      <link rel="stylesheet" type="text/css" href="./alloyicons.css" />
      <style>
        * {
          border: 0;
          margin: 0;
          padding: 0;
        }
        .icon {
          display: inline-block;
          width: 200px;
          height: 150px;
          text-align: center;
          padding: 20px;
          box-sizing: border-box;
        }
        .icon span {
          display: block;
          font-size: 50px;
          line-height: 50px;
          width: 50px;
          height: 50px;
          margin: 0 auto;
        }
        h1 {
          font-family: arial, sans-serif;
          font-size: 30px;
          font-weight: 700;
          margin: 20px;
          text-align: center;
        }
        h2 {
          font-family: arial, sans-serif;
          font-size: 12px;
          font-weight: 700;
          line-height: 16px;
        }
        p {
          font-family: arial, sans-serif;
          font-size: 12px;
          font-weight: 400;
          line-height: 16px;
        }
      </style>
    </head>
    <body>
      <h1>Alloy Icons</h1>
      <div class="icons">
        ${content}
      </div>
    </body>
  </html>`,
  );
}

function generateIconsJson(glyphs, iconsJsonFile) {
  const json = {};
  glyphs.forEach((g) => {
    json['icon-' + g.metadata.name] = {
      unicode: g.metadata.unicode[0],
      categories: categoriesJson.categories
        .filter((c) => c.icons.indexOf(g.metadata.name) >= 0)
        .map((c) => c.key),
    };
  });
  fs.writeFileSync(iconsJsonFile, JSON.stringify(json, null, 2));
}

function generateIconUtils(glyphs, iconUtilsOutputFile, iconUtilsOutputFileIndex) {
  // array of category objects with metadata about the categories e.g. property name, icons included
  // in the category and a stringified dictionary entry for the CATEGORIES map
  const categories = [];
  // array of category property definitions e.g. public static readonly MY_CATEGORY ...
  const tsCategoryProperties = [];
  // process the categories json into the above variables
  categoriesJson.categories.map((c) => {
    // property name of the category to list in the output file
    const propertyName = iconNameToProperty('CATEGORY_' + c.key);
    tsCategoryProperties.push(`public static readonly ${propertyName} = '${c.key}';`);

    // check we don't have duplicate categories
    if (categories.find((a) => a.categoryKey === c.key)) {
      throw `duplicate category key "${c.key}" found`;
    }

    // group by and count the icons in this category to check for duplicates
    const iconCounts = {};
    c.icons.forEach((i) => {
      if (i in iconCounts) {
        iconCounts[i]++;
      } else {
        iconCounts[i] = 1;
      }
    });
    for (const i in iconCounts) {
      if (iconCounts[i] > 1) {
        throw `duplicate icon key "${i}" found in category "${c.key}"`;
      }
    }

    // generate the dictionary value for the categories dictionary at the end of the file
    // this is a mapping of categories to icons
    const dictionaryIcons = c.icons.map((i) => 'IconUtils.' + iconNameToProperty('ICON_' + i));
    const dictionaryValue = JSON.stringify(dictionaryIcons).replace(/"/g, '');

    // populate the data object for this category
    categories.push({
      categoryKey: c.key,
      propertyName,
      // this is used as a lookup for icons to find categories it is a member of
      icons: c.icons.map((i) => {
        // check if the icon exists in processed glyphs
        if (glyphs.find((g) => g.metadata.name === i) === undefined) {
          throw `icon key "${i}" not found in processed icons but specified in category key "${
            c.key
          }"`;
        }
        return {
          icon: i,
          propertyName: iconNameToProperty('ICON_' + i),
        };
      }),
      dictionaryEntry: `['${c.key}', ${dictionaryValue}]`,
    });
  });

  // array of key values formatted as dictionary entries for icons
  const iconProperties = [];
  // array of icon properties to add to the file e.g. public static readonly MY_ICON = ...;
  const tsIconProperties = glyphs.map((g) => {
    const propertyName = 'ICON_' + iconNameToProperty(g.metadata.name);
    iconProperties.push(`['icon-${g.metadata.name}', IconUtils.${propertyName}]`);

    // find all categories this icon belongs to
    const iconCategories = categories
      .filter((c) => c.icons.find((i) => i.icon === g.metadata.name) !== undefined)
      .map((c) => 'IconUtils.' + c.propertyName);
    // build up the definition of the property
    const stringifiedCategories = JSON.stringify(iconCategories).replace(/"/g, '');
    return `public static readonly ${propertyName} = new IconMetadata('icon-${g.metadata.name}', '${
      g.metadata.unicode
    }', ${stringifiedCategories});`;
  });

  // the map to output at the end of the file linking categories -> icons
  const categoriesMap = JSON.stringify(categories.map((c) => c.dictionaryEntry)).replace(/"/g, '');
  // the map of icons to icon code to use as a lookup
  const iconsMap = JSON.stringify(iconProperties).replace(/"/g, '');

  fs.writeFileSync(
    iconUtilsOutputFile,
    `// tslint:disable
// WARNING: this file is auto generated, do not modify manually, see: ./tools/icon-font-generator
import chalk from 'chalk';

export class IconMetadata {
  public readonly className: string;
  public readonly unicode: string;
  public readonly categories: Readonly<string[]>;
  constructor(className: string, unicode: string, categories: string[]) {
    this.className = className;
    this.unicode = unicode;
    this.categories = categories;
  }
}

export abstract class IconUtils {
  // categories
  ${tsCategoryProperties.join('\n  ')}
  // icons
  ${tsIconProperties.join('\n  ')}
  // parse function
  public static parse(iconKey: string): IconMetadata {
    if (IconUtils.ICONS.has(iconKey)) {
      return IconUtils.ICONS.get(iconKey)!;
    } else {
      const message = 'icon with key "' + iconKey + '" requested but no definition found';
      // tslint:disable-next-line:no-console
      console.warn(chalk.yellow(message));
      return new IconMetadata(iconKey, '', []);
    }
  }
  // maps and arrays
  public static readonly CATEGORIES: Readonly<Map<string, IconMetadata[]>> = new Map(${categoriesMap});
  private static readonly ICONS: Readonly<Map<string, IconMetadata>> = new Map(${iconsMap});
}
`,
  );
  fs.writeFileSync(
    iconUtilsOutputFileIndex,
    `// tslint:disable
export * from './IconUtils';
`,
  );
}

function iconNameToProperty(name) {
  return name.toUpperCase().replace(/-/g, '_');
}

function rimraf(target) {
  if (fs.existsSync(target)) {
    fs.readdirSync(target).forEach((entry) => {
      let entryPath = path.join(target, entry);
      if (fs.lstatSync(entryPath).isDirectory()) {
        rimraf(entryPath);
      } else {
        fs.unlinkSync(entryPath);
      }
    });
    fs.rmdirSync(target);
  }
}
