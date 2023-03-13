/*1.建立物件-球點、幾何
  2.光源-點光源-平面光源、環境光、聚光燈
  3.材質-紋理-色彩、反光、散射、凹凸、漫反射
  4.攝影機與渲染 WebGL/Canvas/Css/SVG
  ---------------------------------------

*/

//相機、場景、渲染器
var camera, scene, renderer;
// 形狀 / 材質 / 物件
var geometry, material, mesh;

function init() {
  //建立場景
  scene = new THREE.Scene();

  //antialias毛邊補齊-渲染出來的毛邊較小-採用WebGL運用我們的GPU效能
  renderer = new THREE.WebGLRenderer({ antialias: true });

  //視窗設定
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement); //放網頁上的body標籤，也可以是HTML某個標籤裡面

  //建立方塊物件     /三維寬高   /material法線
  geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
  material = new THREE.MeshNormalMaterial();

  //組合物件跟材質
  mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  //新增光源PointLight點光源 0x是16進位顏色設定 1是流明 100光球半徑
  var light = new THREE.PointLight(0xff0000, 1, 100);
  light.position.set(50, 50, 50);
  scene.add(light);

  //攝影機 fov視野角度70 長除寬比是視窗設定，最近平面0.01 最遠是10
  camera = new THREE.PerspectiveCamera(
    70, //視野角度
    window.innerWidth / window.innerHeight, //視窗寬度-高度
    0.01, //最近的平面
    10, //最遠
  );
  //攝影機架設遠一點 因為方塊物件座標是0
  camera.position.z = 1;
  camera.lookAt(scene.position);
}
init();

//建立渲染器-mesh.position.x+=0.001; 移動位子
function render() {
  mesh.position.x += 0.001;
  mesh.rotation.y += 0.02;
  mesh.rotation.z += 0.02;

  // mesh.position.x+=0.001;
  // mesh.position.z+=0.001;
  renderer.render(scene, camera); //引入場景與設相機
  requestAnimationFrame(render); //排列下一次的渲染
}

render();
