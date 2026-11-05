import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sourceRoot = '/var/folders/6n/sn2pkvnn42n5kzq2c47mflbr0000gn/T/browser-use/assets';
const publicCatalog = path.join(root, 'apps/mobile/public/spots-catalog.json');
const distCatalog = path.join(root, 'apps/mobile/dist/spots-catalog.json');
const mediaRoot = path.join(root, 'apps/mobile/public/place-media');

const items = [
  ['sorsi', 'sorsi_cali', 'e2ff1950-c093-4497-bfaf-3550d0c113e0', '601363188_17847322308605981_5170450394843161863_n.jpg', ['609689200_711532901799797_8076278515953316831_n.jpg', '825324274_17900560077605981_5126844370991662806_n.jpg', '813832326_17898751317605981_6787010047133140452_n.jpg']],
  ['baltazar-y-siete-lunas', 'baltasarysietelunas', '3accede3-7916-4dab-a67a-5e5d776dbc5a', '607984984_17847791328625275_5680569755293760246_n.jpg', ['673839443_1493613905799499_3825320121395794847_n.jpg', '656196376_926028053678869_6718942364027700045_n.jpg', '657611791_940259215587531_570426992441410075_n.jpg']],
  ['memorial', 'memorial_cerveceria', '4fd662be-b1c2-4c6a-9f79-fab906b4ec0d', '579720854_18195852685324471_8176589133130224851_n.jpg', ['837659915_18231149710324471_5129776522429437533_n.jpg', '831340200_18230771839324471_6779277798624962285_n.jpg', '831222244_18230561347324471_1501734705839224302_n.jpg']],
  ['montolivo', 'montolivorestaurante', '14e58a0b-29a8-4ecd-bdb3-f0630e31b121', '495930271_18368756653135339_7962977410483268924_n.jpg', ['819848737_2242973249926090_5121553574286781820_n.jpg', '813959192_18441707530135339_3072922588670781578_n.jpg', '809039574_18076866161651142_582967207267142200_n.jpg']],
  ['natal-coffee', 'natalcoffee.col', 'f2038e6c-84fc-46db-b974-2c6daa5c0432', '615239682_18559327567005744_881953821968686639_n.jpg', ['836930870_18642071158005744_8199979484798169944_n.jpg', '834902862_18641285029005744_3213064494709940986_n.jpg', '829473347_18640566076005744_6420935883879137159_n.jpg']],
  ['namaste', 'namaste.cali.co', 'af5ab007-8630-4ad3-81ce-c79e3310b574', '491442072_970375415127708_4580645874726181781_n.jpg', ['572679448_1493520295219193_5227817288419110400_n.jpg', '833603402_18345211543251522_4700828064118272279_n.jpg', '833186340_1412805924376422_1393096436284457420_n.jpg']],
  ['patti-gelateria', 'pattigelateria', 'dd814c6d-ade3-494c-9bfd-5cd1fd8b8145', '309941226_502311865073132_7030931767701914055_n.jpg', ['840264299_18446676001120439_6502007736050707759_n.jpg', '836858036_18446319403120439_7281445898170413832_n.jpg', '836752091_18446132095120439_5898032125379845486_n.jpg']],
  ['tierradentro-cafe-co', 'tierradentrocafe', '380edf10-c8df-4de0-8b20-f5c2d1fe6272', '503733213_18398007937113957_7700324942157200992_n.jpg', ['838433527_18068115866782546_3076629406891671798_n.jpg', '766495447_18467406922113957_1281086521016256166_n.jpg', '813923174_18476000467113957_3635176129874425318_n.jpg']],
  ['la-chocolatada', 'lachocolatadacali', 'f5c0b0b4-b254-4dd3-8029-90aa25f04ca2', '753428898_17959302192171577_1952314984725722124_n.jpg', ['830390255_17970578565171577_4295179689220429077_n.jpg', '825352129_17969992074171577_7140411790040354332_n.jpg', '811902094_17968050930171577_5222679006619604215_n.jpg']],
  ['maki-bar', 'makibar.col', 'fe268e7d-2c38-4d2d-a3bb-c30e554d3c59', '420879436_909179737414259_1478357347189348956_n.jpg', ['811102562_18110911463518967_8343399743606085393_n.jpg', '841645000_18193506868399024_7646808739312288576_n.jpg', '839352938_18113898977518967_7828860734208217032_n.jpg']],
  ['mugari', 'restaurante_mugari', '4239051e-c6b1-4e13-84aa-fe61939a9982', '495468199_17893121046227114_4417577405788117977_n.jpg', ['840519930_17961082485227114_6444928316634246680_n.jpg', '838544702_17960652372227114_750636990273079720_n.jpg', '832633571_17960201772227114_4059186682825710603_n.jpg']],
  ['la-romanezca', 'laromanezca', 'b0a23fd0-9fbc-4b3b-ab2e-fe305b93b831', '497613268_18040063835566572_7971646360043814737_n.jpg', ['696498480_18079193282566572_8580354038036167995_n.jpg', '500084707_632882976469947_2878866565647299905_n.jpg', '514709332_18045137690566572_2764154107778113831_n.jpg']],
];

const findSpot = (catalog, slug) => catalog.spots.find((spot) => spot.slug === slug);
const findFile = (dir, name) => {
  const manifest = JSON.parse(fs.readFileSync(path.join(sourceRoot, dir, 'manifest.json'), 'utf8'));
  const asset = manifest.assets.find((entry) => entry.name === name);
  if (!asset) throw new Error(`Missing bundled asset ${name} in ${dir}`);
  return asset.path;
};

const catalogs = [publicCatalog, distCatalog].map((file) => ({ file, data: JSON.parse(fs.readFileSync(file, 'utf8')) }));
for (const [slug, instagram, bundle, logoName, postNames] of items) {
  const folder = path.join(mediaRoot, slug);
  fs.mkdirSync(folder, { recursive: true });
  const logoSource = findFile(bundle, logoName);
  const logoFile = `instagram-logo${path.extname(logoSource)}`;
  fs.copyFileSync(logoSource, path.join(folder, logoFile));
  const galleryFiles = postNames.map((name, index) => {
    const source = findFile(bundle, name);
    const file = `instagram-${index + 1}${path.extname(source)}`;
    fs.copyFileSync(source, path.join(folder, file));
    return `/place-media/${slug}/${file}`;
  });
  for (const catalog of catalogs) {
    const spot = findSpot(catalog.data, slug);
    if (!spot) throw new Error(`Missing spot ${slug}`);
    spot.logo_url = `/place-media/${slug}/${logoFile}`;
    spot.cover_image_url = galleryFiles[0];
    spot.gallery_urls = galleryFiles;
    spot.updated_at = new Date().toISOString();
    for (const branch of catalog.data.branches.filter((branch) => branch.spot_id === spot.id)) {
      branch.instagram = `https://www.instagram.com/${instagram}/`;
    }
  }
}
for (const { file, data } of catalogs) fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
console.log(`Updated ${items.length} Instagram profiles with logo, cover and gallery assets.`);
