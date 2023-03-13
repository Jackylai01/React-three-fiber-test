//設定全域變數: 相機、場景、渲染器、容器
var container, renderer, camera, scene;
var characterSize = 1;

//追蹤所有物體和碰撞

var objects = [];

//設定滑鼠和光線投射器

/*raycaster協助光線投射， 確定3D空間中滑鼠正在處於什麼物體之上。(參考官方文件)*/
//Vector2 類代表2D向量。2D空間中的一個點，長度從（0,0）到（x,y），可算出直線距離
var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();

// 記錄動作
var movements = [];
var playerSpeed = 0.1;

init();

function init() {
  //建立html 標籤 div，崁入到body
  container = document.createElement('div');
  document.body.appendChild(container);

  //建立場景與樣式
  //定義線性霧的參數
  //Fog( 顏色 : Integer, 近 : Float, 遠 : Float )
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xccddff);
  scene.fog = new THREE.Fog(0xccddff, 5, 100);

  //全域光源
  var ambient = new THREE.AmbientLight(0xdddddd, 0x000000, 0.5);
  scene.add(ambient);

  //HemisphereLight( skyColor : Integer, groundColor : Integer, intensity : Float )
  //光源位於景觀正上方，其顏色從天空的顏色逐漸淡化到地面的顏色(參考官方解釋)
  var hemisphereLight = new THREE.HemisphereLight(0xdddddd, 0x000000, 0.5);
  scene.add(hemisphereLight);

  createFloor();
  createTree(3, 3);
  createTree(8, -3);
  createTree(-3, 8);
  createTree(-8, -8);

  //建立攝影機
  //攝影機 fov視野角度70 長除寬比是視窗設定，最近平面0.01 最遠是10
  camera = new THREE.PerspectiveCamera(
    60, //視野角度
    window.innerWidth / window.innerHeight, //視窗寬度-高度
    0.01,
    200,
  );

  camera.position.z = 10;
  camera.position.y = 2;
  scene.add(camera);

  /*建立渲染-WebGL -antialias為反鋸齒，預設是false，柔化圖形邊緣因為像素顆粒太明顯而形成的鋸齒狀瑕疵。
	對於網頁的效能，反而會影響降低，因為它會導致網頁更加複雜。參考官方文件、chatGPT*/
  renderer = new THREE.WebGLRenderer({ antialias: true });

  //輸出畫布到HTML
  var element = renderer.domElement;
  //設定 WebGL 渲染器的視口大小(單位為像素)
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(element);

  //DOM 事件，滑鼠按下、滑鼠放開、滑鼠移動、觸控螢幕按下、觸控螢幕放開、觸控螢幕移動
  document.addEventListener('mousedown', onDocumentMouseDown);
  document.addEventListener('mouseup', onDocumentMouseUp);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('touchstart', onDocumentTouchDown);

  // document.addEventListener('touchend', onDocumentTouchUp);
  document.addEventListener('touchmove', onDocumentTouchMove);

  //視窗改變事件，視窗大小改變時調整攝影機的長寬比，並重新設定渲染器的大小。
  window.onresize = function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };

  var toucheMovementX, toucheMovementY;
  //接觸螢幕或滑鼠按下時。觸發在螢幕上的任何位置
  function onDocumentTouchDown(e) {
    e.preventDefault();
    toucheMovementX = e.touches[0].clientX;
    toucheMovementY = e.touches[0].clientY;
  }

  //偵測觸控點的X軸和Y軸移動位置，並計算出與上次移動的位置之間的差值，然後使用差值來調整物體的位置與旋轉角度
  function onDocumentTouchMove(e) {
    e.preventDefault();

    //0.5為移動旋轉的角度。clientX和clientY分別是觸控點X軸和Y軸的位置，toucheMovementX和toucheMovementY用於記錄觸控點上次移動的位置
    e.movementX = 0.5 * (e.touches[0].clientX - toucheMovementX);
    e.movementY = 0.5 * (e.touches[0].clientY - toucheMovementY);
    toucheMovementX = e.touches[0].clientX;
    toucheMovementY = e.touches[0].clientY;
    onMouseMove(e, true);
  }

  //旋轉相機
  //Euler 歐拉角是一個旋轉變換，通過沿著各自軸向的指定角度旋轉物體，以及指定軸向的順序。以弧度為單位，分別表示x軸、y軸、z軸的旋轉角度
  var minPolarAngle = 0; // 最小弧度
  var maxPolarAngle = Math.PI; // 最大弧度
  var pointerSpeed = 1.0;
  const _PI_2 = Math.PI / 2;
  const _euler = new THREE.Euler(0, 0, 0, 'YXZ'); //第四欄為order，為旋轉的順序，預設為"XYZ"，必須為大寫!

  /*當滑鼠移動時，會改變相機的旋轉角度。
  通過使用滑鼠的移動計算出改變的角度，
	並將其設置到相機的四元數中，並限制角度的最大值和最小值，
	以防止相機轉動過度*/
  function onMouseMove(e, ismobile = false) {
    e.preventDefault();

    if (!isClicked && !ismobile) return;

    const movementX = e.movementX || e.mozMovementX || e.webkitMovementX || 0;
    const movementY = e.movementY || e.mozMovementY || e.webkitMovementY || 0;

    //設定矩陣的四元數，並且返回對應的矩陣()
    _euler.setFromQuaternion(camera.quaternion);

    _euler.y += movementX * 0.002 * pointerSpeed;
    _euler.x += movementY * 0.002 * pointerSpeed;

    _euler.x = Math.max(
      _PI_2 - maxPolarAngle,
      Math.min(_PI_2 - minPolarAngle, _euler.x),
    );

    //setFromEuler 為 將 3D 物件的旋轉（Rotation）設定為由給定的 Euler 角度指定的旋轉值(參考官方文件)
    camera.quaternion.setFromEuler(_euler);
  }

  //記錄滑鼠x、y按下時的點擊位置,放到變數內
  var clickPointX, clickPointY;
  var isClicked = false;

  //鼠標按鍵被按下時觸發的事件
  function onDocumentMouseDown(e, ismobile = false) {
    e.preventDefault();

    if (e.which == 1 || ismobile) {
      clickPointX = e.clientX;
      clickPointY = e.clientY;
      isClicked = true;
    }
  }

  //放開滑鼠產生事件
  function onDocumentMouseUp(e, ismobile = false) {
    e.preventDefault();

    //e.which 屬性可以取得按下的按鍵碼，用於判斷使用者按下的是哪個按鍵
    if (e.which === 1 || ismobile) isClicked = false;

    // 滑鼠游標抬起時對比點擊位置，如果移動了，則執行旋轉視角，如果點擊點未移動則執行相機移動
    if (
      (e.which === 1 || ismobile) &&
      clickPointX === e.clientX &&
      clickPointY === e.clientY
    ) {
      stopMovement();

      // 抓取座標
      mouse.x = (e.clientX / renderer.domElement.clientWidth) * 2 - 1;
      mouse.y = -(e.clientY / renderer.domElement.clientHeight) * 2 + 1;

      // 使用射線投射來檢測交叉點，檢測3D圖形中的交錯點，以及在2D圖形中檢測點和線段之間的相交，Raycaster滑鼠正在處於什麼物體之上，放入屬標、相機
      raycaster.setFromCamera(mouse, camera);

      // 檢查射線與物件(無論是否有後代元素)有無相交。回傳相交點值，按距離排序，最接近的排序越靠前。
      var intersects = raycaster.intersectObjects(objects);
      if (intersects.length > 0) {
        movements.push(intersects[0].point);
      }
    }
  }

  /*計算移動的距離，並控制物體在指定位置之間移動，檢查目前位置和目標之間的距離，
	並將距離轉換為乘數。再將移動距離乘以該距離
	然後再乘以該乘數，以確保物體在正確的方向上移動
	在移動完成時，計算移動是否已完成，並停止移動。 */
  function move(location, destination, speed = playerSpeed) {
    var moveDistance = speed;

    // 轉移位置
    var posX = location.position.x;
    var posZ = location.position.z;
    var newPosX = destination.x;
    var newPosZ = destination.z;

    // 設置一个乘數，若需要負值時。
    var multiplierX = 1;
    var multiplierZ = 1;

    //檢查當前的位置和目標之間的距離
    var diffX = Math.abs(posX - newPosX);
    var diffZ = Math.abs(posZ - newPosZ);
    var distance = Math.sqrt(diffX * diffX + diffZ * diffZ);

    // 如有必要，使用負乘数。
    if (posX > newPosX) {
      multiplierX = -1;
    }

    if (posZ > newPosZ) {
      multiplierZ = -1;
    }

    //將原來的位置（location.position）加上計算出的距離（moveDistance），從而得到新的位置。
    location.position.x =
      location.position.x + moveDistance * (diffX / distance) * multiplierX;
    location.position.z =
      location.position.z + moveDistance * (diffZ / distance) * multiplierZ;

    if (
      location.position.x <= newPosX + moveDistance &&
      location.position.x >= newPosX - moveDistance &&
      location.position.z <= newPosZ + moveDistance &&
      location.position.z >= newPosZ - moveDistance
    ) {
      location.position.x = location.position.x;
      location.position.z = location.position.z;

      stopMovement();
      //移動可能會回傳一個布林值，如果完成移動就回傳True，如果沒有完成移動就回傳False。
    }
  }

  // 停止移動
  function stopMovement() {
    movements = [];
    scene.remove(indicatorTop);
    scene.remove(indicatorBottom);
  }

  //渲染
  function render() {
    renderer.render(scene, camera);

    if (movements.length > 0) {
      //getObjectByName-Three.js 的api，從場景中檢索指定名稱的物體。它接受一個字符串參數，表示要檢索的物體的名稱，並返回一個Object3D對象。
      if (scene.getObjectByName('indicator_top') === undefined) {
        drawIndicator();
      } else {
        if (indicatorTop.position.y > 0.1) {
          indicatorTop.position.y -= 0.01;
        } else {
          indicatorTop.position.y = 0.5;
        }
      }

      move(camera, movements[0]);
    }
  }
  animate();
  function animate() {
    requestAnimationFrame(animate);
    render();
  }
  //建立地面
  function createFloor() {
    var geometry = new THREE.PlaneBufferGeometry(100, 100);
    var material = new THREE.MeshToonMaterial({ color: 0x6e6e6e });
    var plane = new THREE.Mesh(geometry, material);
    plane.rotation.x = (-1 * Math.PI) / 2;
    plane.position.y = 0;
    scene.add(plane);
    objects.push(plane);
  }

  // 建立樹
  function createTree(posX, posZ) {
    // Set some random values so our trees look different.
    var randomScale = Math.random() * 3 + 0.8;
    var randomRotateY = Math.PI / Math.floor(Math.random() * 32 + 1);

    // Create the trunk.
    var geometry = new THREE.CylinderGeometry(
      characterSize / 3.5,
      characterSize / 2.5,
      characterSize * 1.3,
      8,
    );

    var material = new THREE.MeshToonMaterial({ color: 0x664422 });
    var trunk = new THREE.Mesh(geometry, material);
    trunk.position.set(posX, (characterSize * 1.3 * randomScale) / 2, posZ);
    trunk.scale.x = trunk.scale.y = trunk.scale.z = randomScale;
    scene.add(trunk);

    var geometry = new THREE.DodecahedronGeometry(characterSize);
    var material = new THREE.MeshToonMaterial({ color: 0x44aa44 });
    var treeTop = new THREE.Mesh(geometry, material);
    treeTop.position.set(
      posX,
      (characterSize * 1.3 * randomScale) / 2 + characterSize * randomScale,
      posZ,
    );
    treeTop.scale.x = treeTop.scale.y = treeTop.scale.z = randomScale;
    treeTop.rotation.y = randomRotateY;
    scene.add(treeTop);
  }

  // 移動目的地的提示
  var indicatorTop;
  // 繪製3d的目標點.
  var indicatorBottom;

  function drawIndicator() {
    var topSize = characterSize / 8;
    var bottomRadius = characterSize / 4;

    // 創建一個四面體幾何體
    //TetrahedronGeometry(radius : Float, detail : Integer)
    //參考官網: https://threejs.org/docs/index.html?q=TetrahedronGeometry#api/en/geometries/TetrahedronGeometry
    var geometry = new THREE.TetrahedronGeometry(topSize, 0);
    //MeshToonMaterial( parameters : Object ) 材質的自發(光)顏色，不受其他照明影響的純色
    var material = new THREE.MeshToonMaterial({
      color: 0x00ccff,
      emissive: 0x00ccff,
    });

    //Mesh 可以包含多個 3D 形狀，例如立方體，球體，圓柱體等。
    indicatorTop = new THREE.Mesh(geometry, material);
    indicatorTop.position.y = 0.05; // 因為表面是平的，所以暫時只能固定Y軸的位置。
    indicatorTop.position.x = movements[0].x; // 獲得 X 軸距離
    indicatorTop.position.z = movements[0].z; // 獲得 Z 軸距離
    indicatorTop.rotation.x = -0.97;
    indicatorTop.rotation.y = Math.PI / 4; //圓周率/4
    indicatorTop.name = 'indicator_top'; //自定義名稱
    scene.add(indicatorTop);

    // 生成圓環幾何體的-這裡指地板的提示位置
    //TorusGeometry(radius : Float, tube : Float, radialSegments : Integer, tubularSegments : Integer, arc : Float)
    var geometry = new THREE.TorusGeometry(
      bottomRadius,
      bottomRadius * 0.25,
      2,
      12,
    );

    geometry.dynamic = true;

    //卡通著色設定
    var material = new THREE.MeshToonMaterial({
      color: 0x00ccff,
      emissive: 0x00ccff,
    });
    indicatorBottom = new THREE.Mesh(geometry, material);
    indicatorBottom.position.y = 0.025;
    indicatorBottom.position.x = movements[0].x;
    indicatorBottom.position.z = movements[0].z;
    indicatorBottom.rotation.x = -Math.PI / 2;
    scene.add(indicatorBottom);
  }
}
