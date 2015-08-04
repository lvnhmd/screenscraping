var Xray = require('x-ray');
var x = Xray();

// x('https://dribbble.com', 'li.group', [{
//   title: '.dribbble-img strong',
//   image: '.dribbble-img [data-src]@data-src',
// }])
//   .paginate('.next_page@href')
//   .limit(3)
//   .write('results.json')

// <li class="shopBrandItem">
// 	<a href="http://www.selfridges.com/en/a-bathing-ape/">A BATHING APE</a>
// </li>

// all categories
// x('http://www.selfridges.com/en/OnlineBrandDirectory', 'li.shopBrandItem', [{
// womens category
x('http://www.selfridges.com/en/OnlineBrandDirectory/?categoryId=548261&storeSelect=ONLINE&catalogId=16151&storeId=10052&langId=-1', 'li.shopBrandItem', [{
  name: 'a',
  url:  'a@href',
}])
  .paginate('.next_page@href')
  .limit(3)
  .write('../persist/selfridges.json')

  