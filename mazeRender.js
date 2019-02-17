// Zmienne związane z three.js
var container, scene, renderer, camera, light, ball, plane, controls, end, clock;
var WIDTH, HEIGHT, VIEW_ANGLE, ASPECT, NEAR, FAR;
var camera_end_pos = new THREE.Vector3();
var text2;

// zmienna zachowująca mapę
var mazeMap;

var keyboard = new THREEx.KeyboardState();

// zmienne związane z obiektami three.js
var size = 10;
var thickness = 20;
var ballRadius = thickness/3;
var speed = 8;
var dropRate = 0.9;
var oneOverZoom = 4*thickness;
var zoom = oneOverZoom;

// Flagi sygnalizujące stan gry
var gamePlay = false;
var gameFinish = false;

// licznik czasu
var switchTimer = new Date().getTime();
var gameStart;
var gameTimer;

// Zegar wykorzystany do renderowania
clock = new THREE.Clock();
var delta = 0;
var interval = 1/30;

// Zmienne - rotacja kamery i prędkość piłki
var rotSpeed = 0.01;
var velocity = new THREE.Vector3();

var ifTimeWanted = true;

Physijs.scripts.worker = 'physijs_worker.js';
Physijs.scripts.ammo = 'ammo.js';

container = document.querySelector('.viewport');


// Opcje w meu
var options = {
    instructions: function() {
        window.location.href = "instructions.html";
    },
    resetMap: function() {
        destroyAndRepeat();
    },
    playTheBall: function(){
        // controls.target = ball.position;
        gamePlay = true;
//        camera.position.set(ball.position.x, zoom, ball.position.z);
        camera_end_pos.set(ball.position.x, zoom, ball.position.z);
        camera.rotation.set(-1.6,0,0);
        // controls.update();
        // controls.reset();
    },
    lookAtTheMap: function(){
        gamePlay = false;
//        camera.position.set(0, size*thickness*3, 0);
        camera_end_pos.set(0, size*thickness*3, 10);
        switchTimer = new Date().getTime();

    }
};


// GŁÓWNY PROGRAM
init();
animate();

// Inicjacia
function init() {
    if(ifTimeWanted){
        text2 = document.createElement('div');
        text2.style.position = 'absolute';
        text2.style.fontFamily="verdana";
        text2.style.fontSize="xx-large";
        //text2.style.zIndex = 1;    // if you still don't see the label, try uncommenting this
        text2.style.width = 100;
        text2.style.height = 100;
        text2.style.color = "white";
        text2.innerHTML = "hi there!";
        text2.style.top = 10 + 'px';
        text2.style.left = 10 + 'px';
        document.body.appendChild(text2);
    }
    
    WIDTH = window.innerWidth,
        HEIGHT = window.innerHeight;

    VIEW_ANGLE = 45,
        ASPECT = WIDTH / HEIGHT,
        NEAR = 1,
        FAR = 10000;

    scene = new Physijs.Scene();
    scene.setGravity(new THREE.Vector3(0, -200, 0));
    scene.addEventListener('update', function () {
        scene.simulate(undefined, 2);
    });

    renderer = new THREE.WebGLRenderer({});

    renderer.setSize(WIDTH, HEIGHT);
    renderer.shadowMapEnabled = true;
    renderer.shadowMapSoft = true;
    renderer.shadowMapType = THREE.PCFShadowMap;
    renderer.shadowMapAutoUpdate = true;

    container.appendChild(renderer.domElement);

    camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);

    camera.position.set(0, size*thickness*3, 10);
    camera_end_pos.set(0, size*thickness*3, 10);
    camera.lookAt(scene.position);
    scene.add(camera);

// EVENTS
    THREEx.WindowResize(renderer, camera);
    THREEx.FullScreen.bindKey({charCode: 'm'.charCodeAt(0)});
// CONTROLS
//     controls = new THREE.OrbitControls(camera, renderer.domElement);

    light = new THREE.DirectionalLight(0xffffff);

    light.position.set(0, 100, 0);
    light.castShadow = true;
    light.shadowCameraLeft = -60;
    light.shadowCameraTop = -60;
    light.shadowCameraRight = 60;
    light.shadowCameraBottom = 60;
    light.shadowCameraNear = 1;
    light.shadowCameraFar = 1000;
    light.shadowBias = -.0001;
    light.shadowMapWidth = light.shadowMapHeight = 1024;
    light.shadowDarkness = .7;

    scene.add(light);
// PLANE
    var floorTexture = new THREE.ImageUtils.loadTexture( 'textures/stone.jpg' );
    floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set( 10, 10 );
    plane = new Physijs.BoxMesh(
        new THREE.CubeGeometry(2*size*thickness,2*size*thickness, 2, 10, 10),
        Physijs.createMaterial(
            new THREE.MeshLambertMaterial({ map: floorTexture, side:THREE.DoubleSide }),
            .4,
            .99
        ),
        0
    );


    plane.receiveShadow = true;
    plane.castShadow = true;
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -thickness/2-1;

    scene.add(plane);

// SKYBOX
    var materialArray = [];
    materialArray.push(new THREE.MeshBasicMaterial({map: THREE.ImageUtils.loadTexture('textures/dawnmountain-xpos.png')}));
    materialArray.push(new THREE.MeshBasicMaterial({map: THREE.ImageUtils.loadTexture('textures/dawnmountain-xneg.png')}));
    materialArray.push(new THREE.MeshBasicMaterial({map: THREE.ImageUtils.loadTexture('textures/dawnmountain-ypos.png')}));
    materialArray.push(new THREE.MeshBasicMaterial({map: THREE.ImageUtils.loadTexture('textures/dawnmountain-yneg.png')}));
    materialArray.push(new THREE.MeshBasicMaterial({map: THREE.ImageUtils.loadTexture('textures/dawnmountain-zpos.png')}));
    materialArray.push(new THREE.MeshBasicMaterial({map: THREE.ImageUtils.loadTexture('textures/dawnmountain-zneg.png')}));
    for (var i = 0; i < 6; i++)
        materialArray[i].side = THREE.BackSide;
    var skyboxMaterial = new THREE.MeshFaceMaterial(materialArray);
    var skyboxGeom = new THREE.CubeGeometry(5000, 5000, 5000, 1, 1, 1);
    var skybox = new THREE.Mesh(skyboxGeom, skyboxMaterial);
    scene.add(skybox);

// THE MAP
    mazeMap = new Maze(size,size);
    for(var y = 0; y < mazeMap.gridH; ++y)
    {
        for(var x = 0; x < mazeMap.gridW; ++x) {
            // Adds a new mesh if needed
            if (mazeMap.gridMap[y][x]==0)
            {

                var wall = new Physijs.BoxMesh(
                    new THREE.CubeGeometry(thickness*0.9,thickness*0.9,thickness*0.9, 10, 10),
                    Physijs.createMaterial(
                        new THREE.MeshLambertMaterial({
                            color: 0xAAAAAA
                        }),
                        .4,
                        .99
                    ),
                    0
                );


                wall.receiveShadow = true;
                wall.castShadow = true;
                wall.name = "THE_WALL_" + y.toString() + "_"+x.toString();
                mazeMap.gridMap[y][x] = wall;
                mazeMap.gridMap[y][x].visible = true;
                mazeMap.gridMap[y][x].position.set(x * thickness - ((size * thickness) / 2)-size*thickness/2, 0, y * thickness - ((size * thickness) / 2)-size*thickness/2);
                scene.add(mazeMap.gridMap[y][x]);
            }
            else
            {
                mazeMap.gridMap[y][x] = false;
            }
        }
    }

// END POINT POSITION
    if(mazeMap.gridMap[2*size-1][2*size-1] == false) {
        var thePos = 2*size-1;
        end = new Physijs.BoxMesh(
            new THREE.CubeGeometry(thickness,thickness,thickness, 10, 10),
            Physijs.createMaterial(
                new THREE.MeshLambertMaterial({
                    color:0xFF0000
                }),
                .4,
                .99
            ),
            0
        );
        end.position.set(-(-((size / 2) * thickness) + (thickness * 2)-size*thickness/2 - thickness), 0, -(-((size/ 2) * thickness) + (thickness * 2)-size*thickness/2 - thickness));
        end.name = "THE_END_"+thePos.toString() + "_" + thePos.toString();
        mazeMap.gridMap[2*size-1][2*size-1] = end;
        scene.add(end);
    } else {
        end = mazeMap.gridMap[2*size-1][2*size-1];
        end.material.color.setHex( 0xFF0000 );
    }

// PLAYER POSITION
    var ballTexture = new THREE.ImageUtils.loadTexture( 'textures/ball.png' );
    ball = new Physijs.SphereMesh(
        new THREE.SphereGeometry(
            ballRadius,
            16,
            16
        ),
        Physijs.createMaterial(
            new THREE.MeshLambertMaterial({
                map:ballTexture,
                reflectivity: .8
            }),
            .4,
            .5
        ),
        2
    );

    ball.castShadow = true;
    ball.receiveShadow = true;
    ball.position.set((-((size / 2) * thickness) + (thickness * 2)-size*thickness/2 - thickness),ballRadius*2,(-((size / 2) * thickness) + (thickness * 2)-size*thickness/2 - thickness));
     
    ball.name = "THE_PLAYER";
    scene.add(ball);

// MENU
    var gui = new dat.GUI();

    gui.add(options,'resetMap');
    gui.add(options,'playTheBall');
    gui.add(options,'lookAtTheMap');
    gui.add(options,"instructions");

    render();
    scene.simulate();
    
    if(ifTimeWanted){
        gameStart = new Date().getTime();
        gameTimer = new Date().getTime() - gameStart;

        text2.innerHTML = getTimeDifference(gameTimer);
    }
}


// Funkcja odpowiedzialna za generowanie nowej mapy gdy resetMap jest true
function destroyAndRepeat(){
    keyboard.destroy();
    keyboard = new THREEx.KeyboardState();
    gamePlay = false;
    gameFinish = false;
    camera.rotation.set(-1.6,0,0);
    camera_end_pos.set(0, size*thickness*3, 10);
    switchTimer = new Date().getTime();
    if(ifTimeWanted){
        gameStart = new Date().getTime();
        gameTimer = new Date().getTime() - gameStart;
        text2.innerHTML = getTimeDifference(gameTimer);
    }
    
    for(var y = 0; y < mazeMap.gridH; ++y)
    {
        for(var x = 0; x < mazeMap.gridW; ++x) {
            if (mazeMap.gridMap[y][x]!=false){
                var myObject = mazeMap.gridMap[y][x];
                var selectedObject = scene.getObjectByName(myObject.name);
                scene.remove(selectedObject);
            }
        }
    }
    
    var selectedObj = scene.getObjectByName(ball.name);
    scene.remove(selectedObj);
    
    mazeMap = new Maze(size,size);
    for(var y = 0; y < mazeMap.gridH; ++y)
    {
        for(var x = 0; x < mazeMap.gridW; ++x) {
            // Adds a new mesh if needed
            if (mazeMap.gridMap[y][x]==0)
            {

                var wall = new Physijs.BoxMesh(
                    new THREE.CubeGeometry(thickness*0.9,thickness*0.9,thickness*0.9, 10, 10),
                    Physijs.createMaterial(
                        new THREE.MeshLambertMaterial({
                            color: 0xAAAAAA
                        }),
                        .4,
                        .99
                    ),
                    0
                );


                wall.receiveShadow = true;
                wall.castShadow = true;
                wall.name = "THE_WALL_" + y.toString() + "_"+x.toString();
                mazeMap.gridMap[y][x] = wall;
                mazeMap.gridMap[y][x].visible = true;
                mazeMap.gridMap[y][x].position.set(x * thickness - ((size * thickness) / 2)-size*thickness/2, 0, y * thickness - ((size * thickness) / 2)-size*thickness/2);
                scene.add(mazeMap.gridMap[y][x]);
            }
            else
            {
                mazeMap.gridMap[y][x] = false;
            }
        }
    }

    if(mazeMap.gridMap[2*size-1][2*size-1] == false) {
        var thePos = 2*size-1;
        end = new Physijs.BoxMesh(
            new THREE.CubeGeometry(thickness,thickness,thickness, 10, 10),
            Physijs.createMaterial(
                new THREE.MeshLambertMaterial({
                    color:0xFF0000
                }),
                .4,
                .99
            ),
            0
        );
        end.position.set(-(-((size / 2) * thickness) + (thickness * 2)-size*thickness/2 - thickness), 0, -(-((size/ 2) * thickness) + (thickness * 2)-size*thickness/2 - thickness));
        end.name = "THE_END_"+thePos.toString() + "_" + thePos.toString();
        mazeMap.gridMap[2*size-1][2*size-1] = end;
        scene.add(end);
    } else {
        end = mazeMap.gridMap[2*size-1][2*size-1];
        end.material.color.setHex( 0xFF0000 );
    }

    var ballTexture = new THREE.ImageUtils.loadTexture( 'textures/ball.png' );
    ball = new Physijs.SphereMesh(
        new THREE.SphereGeometry(
            ballRadius,
            16,
            16
        ),
        Physijs.createMaterial(
            new THREE.MeshLambertMaterial({
                map:ballTexture,
                reflectivity: .8
            }),
            .4,
            .5
        ),
        2
    );

    ball.castShadow = true;
    ball.receiveShadow = true;
    ball.position.set((-((size / 2) * thickness) + (thickness * 2)-size*thickness/2 - thickness),ballRadius*2,(-((size / 2) * thickness) + (thickness * 2)-size*thickness/2 - thickness));
     
    ball.name = "THE_PLAYER";
    scene.add(ball);
    
    zoom = oneOverZoom;
    
}

// Licznik czasu - formatowanie
function getTimeDifference(timeDiff){

    timeDiff /= 1000;

    // get seconds (Original had 'round' which incorrectly counts 0:28, 0:29, 1:30 ... 1:59, 1:0)
    var seconds = Math.round(timeDiff % 60);

    // remove seconds from the date
    timeDiff = Math.floor(timeDiff / 60);

    // get minutes
    var minutes = Math.round(timeDiff % 60);

    // remove minutes from the date
    timeDiff = Math.floor(timeDiff / 60);

    // get hours
    var hours = Math.round(timeDiff % 24);

    // remove hours from the date
    timeDiff = Math.floor(timeDiff / 24);

    // the rest of timeDiff is number of days
    var days = timeDiff ;

    return hours.toString() + ":" + minutes.toString() + ":" + seconds.toString();
}


// Kontroler piłki
function userControl() {
    if (gamePlay) { 
        if ( keyboard.pressed("w") )
        {
            velocity.z -= speed;
        }
        if ( keyboard.pressed("a") )
        {
            velocity.x -= speed;
        }
        if ( keyboard.pressed("s") )
        {
            velocity.z += speed;
        }
        if ( keyboard.pressed("d") )
        {
            velocity.x += speed;
        }
        

//        camera.position.set(ball.position.x, zoom, ball.position.z);
        camera_end_pos.set(ball.position.x, zoom, ball.position.z);
    }
    velocity.x = dropRate * velocity.x;
    velocity.z = dropRate * velocity.z;
    velocity.y = dropRate * velocity.y;
    // console.log(velocity);
    ball.setLinearVelocity(velocity);
}


// Kontrola kamery dla widoku pełnego na planszę
function planeControl() {
    function getDistance(mesh1, mesh2) { 
          var dx = mesh1.position.x - mesh2.position.x; 
          var dy = mesh1.position.y - mesh2.position.y; 
          var dz = mesh1.position.z - mesh2.position.z; 
          return Math.sqrt(dx*dx+dy*dy+dz*dz); 
    }

  var x = camera_end_pos.x,
    y = camera_end_pos.y,
    z = camera_end_pos.z;

  var dist = getDistance(camera, scene);
  if (keyboard.pressed("d")){
    camera_end_pos.x = x * Math.cos(rotSpeed) + z * Math.sin(rotSpeed);
    camera_end_pos.z = z * Math.cos(rotSpeed) - x * Math.sin(rotSpeed);
  } else if (keyboard.pressed("a")){
    camera_end_pos.x = x * Math.cos(rotSpeed) - z * Math.sin(rotSpeed);
    camera_end_pos.z = z * Math.cos(rotSpeed) + x * Math.sin(rotSpeed);
  } 
//    else if(keyboard.pressed("w")) {
//    camera_end_pos.y = y * Math.cos(rotSpeed) + z * Math.sin(rotSpeed);
//    camera_end_pos.z = z * Math.cos(rotSpeed) - y * Math.sin(rotSpeed);
//  } else if(keyboard.pressed("s")) {
//    camera_end_pos.y = y * Math.cos(rotSpeed) - z * Math.sin(rotSpeed);
//    camera_end_pos.z = z * Math.cos(rotSpeed) + y * Math.sin(rotSpeed);
//  }
  var endTimer = new Date().getTime();
  if(endTimer - switchTimer >3000){
    camera.lookAt(scene.position);
  } else {
      camera.rotation.set(-1.6,0,0);
  }
    
}


// Kontrola wysokości kamery
function cameraControl() {
    if ( keyboard.pressed("q") )
    {
        if(zoom <= 2.5*oneOverZoom) {
            zoom = zoom + 0.1*oneOverZoom;
        }
    }
    else if ( keyboard.pressed("e") )
    {
        if(zoom >oneOverZoom) {
            zoom = zoom - 0.1*oneOverZoom;
        }
    }
}


// FUnkcja sprawdzająca warunek gry
function ifFinish() {
    function getDistance(mesh1, mesh2) { 
          var dx = mesh1.position.x - mesh2.position.x; 
          var dy = mesh1.position.y - mesh2.position.y; 
          var dz = mesh1.position.z - mesh2.position.z; 
          return Math.sqrt(dx*dx+dy*dy+dz*dz); 
    }
    
    var dist = getDistance(ball, end);
    if(dist <= 1.05*(ballRadius + thickness/2)) {
        gameFinish = true;
        
        var message = "Congrats\n";
        if(ifTimeWanted) {
            message += "You have finished in: " + getTimeDifference(gameTimer) + "\n";
        }
        
        message += "You want to play again?"; 
        if(confirm(message)) {
            options.resetMap();
        } else {
            alert("To bad!");
        }
    }
}


// Płynne przejście kamery
function cameraSwitch(end) {
//    console.log(end);
    var dx = end.x - camera.position.x; 
    var dy = end.y - camera.position.y; 
    var dz = end.z - camera.position.z; 
    
    var posit = new THREE.Vector3(
        camera.position.x +0.1*dx,
        camera.position.y+0.1*dy,
        camera.position.z+0.1*dz
    );

//    console.log(posit);
    camera.position.set(posit.x, posit.y, posit.z);
    
}


// Animacja właściwa
function animate() {
    requestAnimationFrame( animate );
    if(gamePlay==true){
        userControl(); 
    } else {
        planeControl();
    }
    cameraControl();
    cameraSwitch(camera_end_pos);
    if(gameFinish == false) {
        ifFinish();
    }
    
// Nieścisłości podczas renderowania - użycie zegara three.js
    delta += clock.getDelta();
    if (delta > interval) {
        render();
        
        if(ifTimeWanted){
            gameTimer = new Date().getTime() - gameStart;
            text2.innerHTML = getTimeDifference(gameTimer);
        }
        
        delta = delta % interval;
    }
    // controls.update();
}

function render() {
    for (var i = 5; i < scene.children.length - 5; i++) {
        var obj = scene.children[i];

        //if (obj.position.y <= -50) {
        //  scene.remove(obj);
        //}
    }

    renderer.render(scene, camera);

}
