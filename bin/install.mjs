#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { ensureDirSync, ensureFile } from 'fs-extra';
import {
  input, select, checkbox, confirm, number,
  search, password, expand, editor, rawlist
} from '@inquirer/prompts';
import Handlebars from 'handlebars';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { inquire } from './inquire.mjs';
import { saveconf } from './saveconf.mjs';
import { normalize } from './normalize.mjs';

const argv = yargs(hideBin(process.argv))
  .usage('Usage: npx @tisf/init <platform> [options]')
  .command('$0 <platform>', 't', (yargs) => {
    yargs.positional('platform', {
      describe: 'Platform to initialize',
      type: 'string'
    })
  })
  .help('h')
  .demandCommand(1)
  .parse();

const prompts = {
  input, select, checkbox, confirm, number,
  search, password, expand, editor, rawlist
};

(async () => {
  const { platform } = argv;

  const purl = `https://raw.githubusercontent.com/t-i-f/recipes-${platform}/main/init/prompts.json`;
  const yurl = `https://raw.githubusercontent.com/t-i-f/recipes-${platform}/main/init/action.yml`;
  const p = `npx @tisf/hb -p ${purl} ${yurl} init.yml -s tisf.json -t root`;
  execSync(p, {stdio: "inherit"});

  const tconf = await fs.promises.readFile('tisf.json', 'utf8');
  const tisf = JSON.parse(tconf);

  const pth = path.resolve(tisf.slug)
  const gitp = path.resolve(tisf.slug, '.github', "workflows")

  ensureDirSync(gitp)

  let fconf = {};

  for(const x of tisf.features) {
    const q = await normalize(`@recipes-${platform}/features/${x}/prompts.json`);
    const a = await inquire(q.prompts);
    fconf = await saveconf(a, "tisf.json", 'features', x);
  }

  for(const x of tisf.modules) {
    const q = await normalize(`@recipes-${platform}/modules/${x}/prompts.json`);
    const a = await inquire(q.prompts);
    fconf = await saveconf(a, "tisf.json", 'modules', x);
  }

  execSync(`npx @tisf/hb tisf.json @recipes-${platform}/init/setup.yml setup.yml -t root`);
  execSync(`mv tisf.json ${pth} && mv init.yml ${gitp} && mv setup.yml ${gitp}`);

  console.log('Adding and committing.');
  execSync(`cd ${pth} && npx @tisf/repo refresh ${tisf.repo}`);

  console.log('Project setup complete.');
})();
