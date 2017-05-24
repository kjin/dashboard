
import * as express from 'express';
import * as pify from 'pify';
import * as semver from 'semver';

const david = require('david');
const got = require('got');
const npmUserPackages = require('npm-user-packages');
const packageJson = require('package-json');

const getDependencies = pify(david.getDependencies);

interface DependencyStatus {
  name: string;
  wanted: string;
  stable: string;
  upToDate: string;
}

const app = express();
app.set('view engine', 'pug');

app.use(express.static('public'));

app.get('/packages', async (_req, res) => {
  console.log('requesting user packages');
  const packageList = await getUserPackages(['grpc-packages', 'google-admin'/*, 'google-cloud-admin'*/]);
  res.render('packages',
    { message: 'Google Package Dashboard', packages: packageList });
});

app.get('/deps', async (req, res) => {
  console.log('requesting deps details for package');
  const pkgName = req.query.pkgName;
  const dependencies = await getDependencyStatus(pkgName);
  console.log(dependencies);
  res.render('deps.pug', {
    message: `Dependency Status for ${pkgName}`,
    dependencies: dependencies
  });
});

app.listen(8080, () => { console.log('Listening on port 8080'); });

async function getUserPackages(users: Array<string>):
  Promise<any> {
  console.log('getting user packages', users);
  const promises = users.map((user) => npmUserPackages(user));
  const packages = [].concat.apply([], await Promise.all(promises));

  console.log('got packages', packages);
  for (let pkg of packages) {
    pkg.downloads = pkg.downloads || {};
    const stats: number = await getDownloadStats(pkg.name);
    pkg.downloads.lastWeek = stats;
  }

  for (let pkg of packages) {
    const list = await getDependencyStatus(pkg.name);
    pkg.depsUpToDate = list.every((dep: DependencyStatus) => dep.upToDate === '✅') ?
      '✅' : '❌';
  }
  return packages;
}

async function getDownloadStats(pkg: string): Promise<any> {
  // const periods = ['last-day', last-week', 'last-month'];
  // TODO: sparklines or other inline chart.
  const url = `https://api.npmjs.org/downloads/point/last-week/${pkg}`;
  try {
    console.log('getting download stats for', pkg, url);
    const res: any = await got(url);
    const body: any = JSON.parse(res.body);
    return body.downloads;
  } catch (e) {
    console.log(url, e);
  }
}

async function getDependencyStatus(pkg: string, version: string = 'latest'): Promise<Array<DependencyStatus>> {
  const json = await packageJson(pkg, version);
  const deps = await getDependencies(json);

  return Object.keys(deps).map((depName) => {
    const required = deps[depName].required || '*';
    const stable = deps[depName].stable || 'None';
    const upToDate = semver.satisfies(stable, required) ? '✅' : '❌';
    return {
      name: depName,
      wanted: required,
      stable: stable,
      upToDate: upToDate
    };
  });
}
