const environments = {
    'shapes': {
        'scene': 'data/scenes/shapes.json',
        'motion': 'data/motions/motion.json',
        'path': 'data/paths/shapes.json'
    },
    'forest': {
        'scene': 'data/scenes/forest.json',
        'motion': 'data/motions/motion.json',
        'path': 'data/paths/forest.json'
    },
    'lavals_unfiltered': {
        'scene': 'data/scenes/lavals_final.json',
        'motion': 'data/motions/lavals_unfiltered.json',
        'path': 'data/paths/lavals_unfiltered.json'
    },
    'lavals_filtered': {
        'scene': 'data/scenes/lavals_final.json',
        'motion': 'data/motions/lavals_filtered.json',
        'path': 'data/paths/lavals_averaged.json'
    }
}

const Params = function() {
    // THIS CHANGES THE ANGLE OF ROTATION...
    this.duration = 20;
    this.isPlay = true;
    this.t = 0;
    this.start = Date.now();
    this.reset = () => reset(this);
    this.isPlay = false;
    this.birdCam = true;
    // this.shapes = () => start(environments['shapes']);
    // this.forest = () => start(environments['forest']);
    this.lavals_unfiltered = () => start(environments['lavals_unfiltered']);
    this.lavals_filtered = () => start(environments['lavals_filtered']);
    this.animationId = 0;
}

const gui = new dat.GUI();
const params = new Params();

const dur_ctrl = gui.add(params, 'duration');
gui.add(params, 'reset');
gui.add(params, 'birdCam');

dur_ctrl.onChange((v) => reset(params));

let efolder = gui.addFolder('Environments');
// efolder.add(params, 'shapes');
// efolder.add(params, 'forest');
efolder.add(params, 'lavals_unfiltered');
efolder.add(params, 'lavals_filtered');
efolder.open();

function lerp(v0, v1, t) {
    return (1 - t) * v0 + t * v1;
}

function getColumn(mtx, j) {
    values = []
    for (let i = 0; i < mtx.length; i++) {
        values.push(mtx[i][j]);
    }
    return values;
}

function start(environment) {
    cancelAnimationFrame(params.animationId);
    const gyroPromise = fetch(environment.motion).then(function(response){
        return response.json()
    });
    const pathPromise = fetch(environment.path).then(function(response){
        return response.json()
    });

    Promise.all([gyroPromise, pathPromise]).then(function(values){
        gyro = values[0];
        path = values[1]['path'];

        opencv_to_opengl = new THREE.Matrix3();
        opencv_to_opengl.set(
            1,  0,  0,
            0, 1,  0,
            0,  0, 1);

        // const scaleX = 1;
        // const scaleY = 1;
        // const scaleZ = 1;

        const scaleX = 0.4;
        const scaleY = 1;
        const scaleZ = 1;
        path_vectors = []
        for (let i = 0; i < path.length; i++) {
            const vec = new THREE.Vector3(path[i][0] * scaleX, 3, path[i][2] * scaleZ).applyMatrix3(opencv_to_opengl);
            path_vectors.push(vec);
        }

        init(gyro, path_vectors, environment.scene);
    });
}

function reset(params) {
    params.t = 0;
    params.start = Date.now();
}

function setupScene(scenePath) {

    const scene = new THREE.Scene();
    const loader = new THREE.ObjectLoader();
    loader.load(scenePath, function( sceneData ) {
        scene.add(sceneData);
    });
    // scene.background = new THREE.Color(0x87ceeb);

    // // OBJECT
    // const geometry = new THREE.BoxGeometry(1, 1, 1);
    // const material = new THREE.MeshLambertMaterial({ color: 0x00ff00 });
    // const cube = new THREE.Mesh(geometry, material );
    // cube.position.y = 0.5;
    // scene.add(cube);

    // GROUND
    // const groundGeo = new THREE.PlaneGeometry(400,400);
    // const groundTexture = new THREE.TextureLoader().load('textures/grass.jpg');
    // groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
    // groundTexture.offset.set( 0, 0 );
    // groundTexture.repeat.set(400, 400);
    // const groundMat = new THREE.MeshBasicMaterial({map: groundTexture});
    // const ground = new THREE.Mesh(groundGeo,groundMat);
    // ground.position.y = -0.1; //lower it
    // ground.rotation.x = -Math.PI/2; //-90 degrees around the xaxis
    // ground.doubleSided = true;
    // scene.add(ground);

    // SKYBOX
    // const skyGeo = new THREE.CubeGeometry(1000, 1000, 1000, 1, 1, 1, null, true);
    // const urls = [
    //     'skybox/hills_rt.png',
    //     'skybox/hills_lf.png',
    //     'skybox/hills_up.png',
    //     'skybox/hills_dn.png',
    //     'skybox/hills_bk.png',
    //     'skybox/hills_ft.png'
    // ]

	// var skyMats = [];
	// for (var i = 0; i < 6; i++)
	// 	skyMats.push( new THREE.MeshBasicMaterial({
	// 		map: new THREE.TextureLoader().load(urls[i]),
	// 		side: THREE.BackSide
	// 	}));
	// var skybox = new THREE.Mesh(skyGeo, skyMats);
    // scene.add( skybox );

    // LIGHTING

    // const light = new THREE.HemisphereLight( 0x87ceeb, 0x008000, 1 );
    // scene.add( light );

    // const axesHelper = new THREE.AxesHelper( 5 );
    // scene.add( axesHelper );

    // var axesHelper = new THREE.AxesHelper( 5 );
    // scene.add( axesHelper );

    return scene;
}

function setupCurve(scene, positions) {
    var curve = new THREE.CatmullRomCurve3(positions);

    const points = curve.getPoints( 50 );
    const curveGeo = new THREE.BufferGeometry().setFromPoints( points );
    const curveMat = new THREE.LineBasicMaterial( { color : 0xff0000 } );

    // Create the final object to add to the scene
    const curveObject = new THREE.Line( curveGeo, curveMat );
    scene.add(curveObject);
    return curve;
}

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

function init(motion, path, scenePath) {
    const scene = setupScene(scenePath);

    const birdCam = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 10000);
    birdCam.position.set(-10, 10, 1);
    birdCam.lookAt(new THREE.Vector3(0, 0, 0));

    const controls = new THREE.OrbitControls( birdCam , renderer.domElement);
    controls.update();

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
    const camBallGeo = new THREE.SphereGeometry(0.3, 30, 30);
    const camBallMat = new THREE.MeshBasicMaterial({color: 0xffff00});
    const camBall = new THREE.Mesh(camBallGeo, camBallMat);
    camBall.position.copy(camera.position);
    scene.add(camBall);

    const cameraHelper = new THREE.CameraHelper( camera );
    scene.add( cameraHelper );

    const curve = setupCurve(scene, path);

    rolls = getColumn(motion['rotations'], 0);
    pitches = getColumn(motion['rotations'], 1);
    yaws = getColumn(motion['rotations'], 2);

    function animate() {
        params.animationId = requestAnimationFrame( animate );
        controls.update();
        let roll, pitch, yaw;
        let duration =  params.duration * 1000; // ms
        const f = (Date.now() - params.start) / duration;
        // add some linear interpolation ?
        if (f <= 1) {
            const pos = curve.getPointAt(f);
            camera.position.copy(pos);
            const tangent = curve.getTangent(f).normalize();
            camera.lookAt(pos.add(tangent));
            camBall.position.set(camera.position.x, camera.position.y, camera.position.z);

            const j = params.t % 5;

            if (j == 0) {
                roll = rolls[params.t];
                pitch = pitches[params.t];
                yaw = yaws[params.t];
            } else {
                const s = (j/6 - (j-1)/5) / (1/5);
                roll = lerp(rolls[params.t-1], rolls[params.t], s);
                pitch = lerp(pitches[params.t-1], pitches[params.t], s);
                yaw = lerp(yaws[params.t-1], yaws[params.t], s);
            }

            if (params.t < rolls.length) {
                camera.rotation.x += pitch * Math.PI / 180;
                camera.rotation.y += roll * Math.PI / 180;
                camera.rotation.z += yaw * Math.PI / 180;
            } else {
                params.t = 0;
            }
            params.t += 1;

        } else {
            reset(params);
        }

        if (params.birdCam) {
            renderer.render(scene, birdCam);
        } else {
            renderer.render(scene, camera);
        }
    }
    animate();
}

start(environments['lavals_filtered']);
