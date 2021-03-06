/* 
------------------------------
------- INPUT SECTION -------- 
------------------------------
*/

/**
 * This class binds key listeners to the window and updates the controller in attached player body.
 * 
 * @typedef InputHandler
 */
class InputHandler {
	key_code_mappings = {
		button: {
			32: {key: 'space', state: 'action_1'}
		},
		axis: {
			68: {key: 'right', state: 'move_x', mod: 1},
			65: {key: 'left', state: 'move_x', mod: -1},
			87: {key: 'up', state: 'move_y', mod: -1},
			83: {key: 'down', state: 'move_y', mod: 1}
		}
	};
	player = null;

	constructor(player) {
		this.player = player;

		// bind event listeners
		window.addEventListener("keydown", (event) => this.keydown(event), false);
		window.addEventListener("keyup", (event) => this.keyup(event), false);
	}

	/**
	 * This is called every time a keydown event is thrown on the window.
	 * 
	 * @param {Object} event The keydown event
	 */
	keydown(event) {
		this.player.raw_input[event.keyCode] = true;
	}

	/**
	 * This is called every time a keyup event is thrown on the window.
	 * 
	 * @param {Object} event The keyup event
	 */
	keyup(event) {
		delete this.player.raw_input[event.keyCode];
	}

	resetController() {
		// reset all buttons to false
		for (let mapping of Object.values(this.key_code_mappings.button)) {
			this.player.controller[mapping.state] = false;
		}

		// reset all axis to zero
		for (let mapping of Object.values(this.key_code_mappings.axis)) {
			this.player.controller[mapping.state] = 0;
		}
	}

	pollController() {
		this.resetController();

		// poll all bound buttons
		for (let [key_code, mapping] of Object.entries(this.key_code_mappings.button)) {
			if (this.player.raw_input[key_code] === true) {
				this.player.controller[mapping.state] = true;
			}
		}

		// poll all bound axis
		for (let [key_code, mapping] of Object.entries(this.key_code_mappings.axis)) {
			if (this.player.raw_input[key_code] === true) {
				this.player.controller[mapping.state] += mapping.mod;
			}
		}
	}
}

/* 
------------------------------
------- BODY SECTION  -------- 
------------------------------
*/

/**
 * Represents a basic physics body in the world. It has all of the necessary information to be
 * rendered, checked for collision, updated, and removed.
 * 
 * @typedef Body
 */
class Body {
	position = {x: 0, y: 0};
	velocity = {x: 0, y: 0};
	size = {width: 10, height: 10};
	health = 100;

	/**
	 * Creates a new body with all of the default attributes
	 */
	constructor() {
		// generate and assign the next body id
		this.id = running_id++;
		// add to the entity map
		entities[this.id] = this;
	}

	/**
	 * @type {Object} An object with two properties, width and height. The passed width and height
	 * are equal to half ot the width and height of this body.
	 */
	get half_size() {
		return {
			width: this.size.width / 2,
			height: this.size.height / 2
		};
	}

	/**
	 * @returns {Boolean} true if health is less than or equal to zero, false otherwise.
	 */
	isDead() {
		return this.health <= 0;
	}

	/**
	 * Updates the position of this body using the set velocity.
	 * 
	 * @param {Number} delta_time Seconds since last update
	 */
	update(delta_time) {
		// move body
		this.position.x += delta_time * this.velocity.x;
		this.position.y += delta_time * this.velocity.y;
	}

	/**
	 * This function draws a green line in the direction of the body's velocity. The length of this
	 * line is equal to a tenth of the length of the real velocity
	 * 
	 * @param {CanvasRenderingContext2D} graphics The current graphics context.
	 */
	draw(graphics) {
		graphics.strokeStyle = '#00FF00';
		graphics.beginPath();
		graphics.moveTo(this.position.x, this.position.y);
		graphics.lineTo(this.position.x + this.velocity.x / 10, this.position.y + this.velocity.y / 10);
		graphics.stroke();
	}

	/**
	 * Marks this body to be removed at the end of the update loop
	 */
	remove() {
		queued_entities_for_removal.push(this.id);
	}
}

/**
 * Represents an player body. Extends a Body by handling input binding and controller management.
 * @inheritdoc 
 * @typedef Player
 */
class Player extends Body 
{
	// this controller object is updated by the bound input_handler
	controller = {
		move_x: 0,
		move_y: 0,
		action_1: false
	};
	raw_input = {};
	speed = 250;
	input_handler = null;
	angle = 0;
	poweredUp = false;

	


	/**
	 * Creates a new player with the default attributes.
	 */
	constructor() {
		super();

		this.shotTime = 1;
		this.score = 0;
		this.timeAlive=0;
		this.enemiesKilled=0;
		this.poweredUp = false;

		// bind the input handler to this object
		this.input_handler = new InputHandler(this);

		// we always want our new players to be at this location
		this.position = {
			x: config.canvas_size.width / 2,
			y: config.canvas_size.height - 100
		};
		this.velocity = {x:this.speed,y:0}
	}

	/**
	 * Draws the player as a triangle centered on the player's location.
	 * 
	 * @param {CanvasRenderingContext2D} graphics The current graphics context.
	 */
	draw(graphics) {
		let newx = this.position.x // this.half_size.width;
		let newy = this.position.y // this.half_size.height;

		graphics.save();
		graphics.translate(newx, newy);
		graphics.rotate(this.angle+Math.PI/2);
		graphics.translate(-newx, -newy);

		graphics.drawImage(shipImage,this.position.x-15,this.position.y-15, 30,30 )
			
		graphics.restore();

		// draw velocity lines
		super.draw(graphics);
	}

	/**
	 * Updates the player given the state of the player's controller.
	 * 
	 * @param {Number} delta_time Time in seconds since last update call.
	 */
	update(delta_time) {
		/*
			implement player movement here!

			I recommend you look at the development console's log to get a hint as to how you can use the
			controllers state to implement movement.

			You can also log the current state of the player's controller with the following code
			console.log(this.controller);
		 */

		this.move();

		this.timeAlive+=delta_time;

		if(this.shotTime > 0 )
			this.shotTime = this.shotTime - delta_time

		if(this.shotTime < 0)
			this.shotTime = 0

		if(this.controller.action_1 && this.shotTime <= 0){
			//console.log("hLELO")
			if(!this.poweredUp)
				new laser(this.position.x,this.position.y,this.velocity.x,this.velocity.y,this.angle, false)

			//new laser(this.position.x,this.position.y,this.velocity.x,this.velocity.y,this.angle, true)
			else{
				let angleShot = Math.PI/11
				let newvx = this.velocity.x * Math.cos(angleShot) - this.velocity.y * Math.sin(angleShot)
				console.log(newvx)
				let newvy = this.velocity.y * Math.cos(angleShot) + this.velocity.x * Math.sin(angleShot) 

				let newvx2 = this.velocity.x * Math.cos(angleShot) + this.velocity.y * Math.sin(angleShot) 
				let newvy2 = this.velocity.y * Math.cos(angleShot) - this.velocity.x * Math.sin(angleShot) 

				new laser(this.position.x,this.position.y,newvx,newvy,this.angle+angleShot, true)
				new laser(this.position.x,this.position.y,newvx2,newvy2,this.angle-angleShot, true)
				new laser(this.position.x,this.position.y,this.velocity.x,this.velocity.y,this.angle, true)
			}

			this.shotTime += 0.5
		}
		 

		// update position
		super.update(delta_time);

		// clip to screen
		this.position.x = Math.min(Math.max(0, this.position.x), config.canvas_size.width);
		this.position.y = Math.min(Math.max(0, this.position.y), config.canvas_size.height);
	}


	/**
	 * Changes the velocity of the player given the state of the player's controller.
	 * 
	 */
	move(){

		if( this.controller.move_x == 1 && this.controller.move_y == 0 ){
			this.velocity.x = this.speed;
			this.velocity.y = 0;
			this.angle = 0;
		}
		else if(this.controller.move_x == -1 && this.controller.move_y == 0){
			this.velocity.x = -this.speed;
			this.velocity.y = 0;
			this.angle = Math.PI;
		}
		else if(this.controller.move_x == 0 && this.controller.move_y == 1){
			this.velocity.x = 0;
			this.velocity.y = this.speed;
			this.angle = Math.PI/2;
		}
		else if(this.controller.move_x == 0 && this.controller.move_y == -1){
			this.velocity.x = 0;
			this.velocity.y = -this.speed;
			this.angle = 3*Math.PI/2;
		}
		else if(this.controller.move_x == -1 && this.controller.move_y == 1){
			this.velocity.x = -this.speed*Math.cos(Math.PI/4);
			this.velocity.y = this.speed*Math.sin(Math.PI/4);
			this.angle = 3*Math.PI/4;
		}
		else if(this.controller.move_x == -1 && this.controller.move_y == -1){
			this.velocity.x = -this.speed*Math.cos(Math.PI/4);
			this.velocity.y = -this.speed*Math.sin(Math.PI/4);
			
			this.angle = 5*Math.PI/4;
		}
		else if(this.controller.move_x == 1 && this.controller.move_y == 1){
			this.velocity.x = this.speed*Math.cos(Math.PI/4);
			this.velocity.y = this.speed*Math.sin(Math.PI/4);
			
			this.angle = Math.PI/4;
		}
		else if(this.controller.move_x == 1 && this.controller.move_y == -1){
			this.velocity.x = this.speed*Math.cos(Math.PI/4);
			this.velocity.y = -this.speed*Math.sin(Math.PI/4);
			this.angle = 7*Math.PI/4;
		}
	}
}


/**
* Represents an player body. Extends a Body by handling input binding and controller management.
* @inheritdoc 
* @typedef Enemy
*/
class Enemy extends Body {
	speed = 50;
	ticker;


	constructor(){ 
		super();

		this.ticker = Math.random()*5;

		//start ene	mies above the canvas
		this.position = {
			x: Math.random()*config.canvas_size.width,
			y: 0 - 100
		};

	}

	draw(graphics) {
		graphics.drawImage(enemyImage, this.position.x -20, this.position.y-20, 40,40)
		graphics.strokeStyle = '#AA0003';
		graphics.beginPath();
		graphics.moveTo(
			this.position.x - this.half_size.width,
			this.position.y - this.half_size.height
		);
		graphics.lineTo(
			this.position.x + this.half_size.width,
			this.position.y - this.half_size.height
		);
		graphics.lineTo(
			this.position.x + this.half_size.width,
			this.position.y + this.half_size.height
		);
		graphics.lineTo(
			this.position.x - this.half_size.width,
			this.position.y + this.half_size.height
		);
		graphics.lineTo(
			this.position.x - this.half_size.width,
			this.position.y - this.half_size.height
		);
		graphics.stroke();

		// draw velocity lines
		super.draw(graphics);

	}


	update(delta_time) {

		this.ticker += delta_time;

		if(this.ticker > 3){
			this.velocity.y = this.speed*(Math.random()+0.1)
			this.velocity.x = (Math.random() - 0.5)* 2 * this.speed;
			this.ticker = 0;
		}
		// update position
		super.update(delta_time);

		// clip to screen
		this.position.x = Math.min(Math.max(0, this.position.x), config.canvas_size.width);
		//this.position.y = Math.min(Math.max(0, this.position.y), config.canvas_size.height);

		if(this.position.y > config.canvas_size.height)
			this.remove();
	}


}
/**
* Represents an laser body. Extends a Body by having a unique draw and movement pattern.
* @inheritdoc 
* @typedef laser
*/
class laser extends Body {
	speed=2;
	angle=0;
	isOrb=false;


	constructor(inx,iny,inVx,inVy,angle,isOrb){
		super();

		this.isOrb = isOrb;
		this.angle = angle;

		this.position = {
			x: inx + 0.05*inVx,
			y: iny + 0.05*inVy
		};

		//if(inVx==0)

		this.velocity = {x: inVx*this.speed,y: inVy*this.speed}
		console.log(this.velocity)
	}


	update(delta_time){
		super.update(delta_time);

		if(this.position.y > config.canvas_size.height || this.position.y < 0)
			this.remove();
		if(this.position.x > config.canvas_size.width || this.position.x < 0)
			this.remove();
	}


	draw(graphics) {
		let newx = this.position.x // this.half_size.width;
		let newy = this.position.y // this.half_size.height;

		graphics.save();
		graphics.translate(newx, newy);
		graphics.rotate(this.angle) //Math.PI/2);
		graphics.translate(-newx, -newy);

		if(this.isOrb){
			graphics.drawImage(orbImage,this.position.x-10,this.position.y-10,20,20)
		}
		else
			graphics.drawImage(greenlaserImage,this.position.x-30,this.position.y-30,60,60)
			
		graphics.restore();

		// draw velocity lines
		//super.draw(graphics);
	}
		


}

/**
 * spawner object used to summon new enemies over a certain interval
 * 
 * @typedef spawner
 */
class spawner {

	timespent = 0;

	constructor(){ 
		this.timespent = 0;

		new powerUp(300,400)
	}

	update(delta_time) {
		this.timespent += delta_time;

		if(this.timespent>5){
			this.timespent=0;
			for (let index = 0; index < 5; index++) {
				new Enemy()
			}
		}

	}
	
}

/**
 * 
 * Class that acts as an object responsible for testing all relevant collisions
 * 
 * @typedef collisionChecker
 *  
 */
class collisionChecker {

	//empty constructor
	constructor(){}

	update(delta_time){

		//single loop, since player is always known
		Object.values(entities).forEach(entity => {
			
			//check all enemies
			if(entity instanceof Enemy){

				//if collided with player
				if (player.position.x< entity.position.x + entity.size.width &&
					player.position.x + player.size.width > entity.position.x &&
					player.position.y < entity.position.y + entity.size.height &&
					player.position.y + player.size.height > entity.position.y){
					
					//console.log("COLLISION DETECTED");
					
					//kill enemy
					entity.remove();
					
					//remove health
					player.health -=5;
				}
			}

			//check for powerUP
			if(entity instanceof powerUp){

				//if collided with player
				if (player.position.x< entity.position.x + entity.size.width &&
					player.position.x + player.size.width > entity.position.x &&
					player.position.y < entity.position.y + entity.size.height &&
					player.position.y + player.size.height > entity.position.y){
						
					//remove powerUp
					entity.remove();
						
					//remove health
					player.poweredUp = true
				}
			}
		});

		//double loop, for each entity check every other entity
		Object.values(entities).forEach(eni => {
			Object.values(entities).forEach(las => {
			
			//if the set of objects is a laser and an enemy
			if(eni instanceof Enemy && las instanceof laser)
				
				//check for collision
				if (eni.position.x< las.position.x + las.size.width &&
					eni.position.x + eni.size.width > las.position.x &&
					eni.position.y < las.position.y + las.size.height &&
					eni.position.y + eni.size.height > las.position.y){

					//remove enemy and laser
					eni.remove();
					las.remove();

					//add to kill counter
					player.enemiesKilled += 1;
				}
			});
		});

		//updates score every collision check
		player.score = Math.floor(30 * player.enemiesKilled + player.timeAlive)
	}

}

/**
* Represents an powerup body. Extends a Body changing player's poweredUp status when removed
* 
* @typedef powerUp
* @inheritdoc  
*/
class powerUp extends Body {

	constructor(inx,iny){
		super();

		this.position = {
			x: inx ,
			y: iny 
		};
	}

	draw(graphics) {
		graphics.drawImage(powerUpImage,this.position.x-10,this.position.y-10,20,20)
		// draw velocity lines
		super.draw(graphics);
	}
		


}



/* 
------------------------------
------ CONFIG SECTION -------- 
------------------------------
*/

const config = {
	graphics: {
		// set to false if you are not using a high resolution monitor
		is_hi_dpi: true
	},
	canvas_size: {
		width: 1000,
		height: 500
	},
	update_rate: {
		fps: 60,
		seconds: null
	}
};

config.update_rate.seconds = 1 / config.update_rate.fps;

// grab the html span
const game_state = document.getElementById('game_state');

// grab the html canvas
const game_canvas = document.getElementById('game_canvas');
game_canvas.style.width = `${config.canvas_size.width}px`;
game_canvas.style.height = `${config.canvas_size.height}px`;

const graphics = game_canvas.getContext('2d');

var shipImage = new Image();
shipImage.src = './ship.png';

var enemyImage = new Image();
enemyImage.src = './bat.gif'

var greenlaserImage = new Image();
greenlaserImage.src = './laser.png'

var powerUpImage = new Image();
powerUpImage.src = './powerUp.png'

var bgImage = new Image();
bgImage.src = './space.jpg'

var orbImage = new Image();
orbImage.src = './orb.png'

// for monitors with a higher dpi
if (config.graphics.is_hi_dpi) {
	game_canvas.width = 2 * config.canvas_size.width;
	game_canvas.height = 2 * config.canvas_size.height;
	graphics.scale(2, 2);
} else {
	game_canvas.width = config.canvas_size.width;
	game_canvas.height = config.canvas_size.height;
	graphics.scale(1, 1);
}

/* 
------------------------------
------- MAIN SECTION  -------- 
------------------------------
*/

/** @type {Number} last frame time in seconds */
var last_time = null;

/** @type {Number} A counter representing the number of update calls */
var loop_count = 0;

/** @type {Number} A counter that is used to assign bodies a unique identifier */
var running_id = 0;

/** @type {Object<Number, Body>} This is a map of body ids to body instances */
var entities = null;

/** @type {Array<Number>} This is an array of body ids to remove at the end of the update */
var queued_entities_for_removal = null;

/** @type {Player} The active player */
var player = null;

/* You must implement this, assign it a value in the start() function */
var enemy_spawner = null;

/* You must implement this, assign it a value in the start() function */
var collision_handler = null;

/**
 * This function updates the state of the world given a delta time.
 * 
 * @param {Number} delta_time Time since last update in seconds.
 */
function update(delta_time) {
	// poll input
	player.input_handler.pollController();

	// move entities
	Object.values(entities).forEach(entity => {
		entity.update(delta_time);
	});

	// detect and handle collision events
	if (collision_handler != null) {
		collision_handler.update(delta_time);
	}

	// remove enemies
	queued_entities_for_removal.forEach(id => {
		delete entities[id];
	})
	queued_entities_for_removal = [];

	// spawn enemies
	if (enemy_spawner != null) {
		enemy_spawner.update(delta_time);
	}

	// allow the player to restart when dead
	if (player.isDead() && player.controller.action_1) {
		start();
	}
}

/**
 * This function draws the state of the world to the canvas.
 * 
 * @param {CanvasRenderingContext2D} graphics The current graphics context.
 */
function draw(graphics) {
	// default font config
	graphics.font = "10px Arial";
	graphics.textAlign = "left";

	// draw background (this clears the screen for the next frame)
	graphics.fillStyle = '#FFFFFF';
	graphics.fillRect(0, 0, config.canvas_size.width, config.canvas_size.height);
	graphics.drawImage(bgImage,0,0,config.canvas_size.width,config.canvas_size.height)

	// for loop over every eneity and draw them
	Object.values(entities).forEach(entity => {
		entity.draw(graphics);
	});

	// game over screen
	if (player.isDead()) {
		graphics.font = "30px Arial";
		graphics.textAlign = "center";
		graphics.fillText('Game Over', config.canvas_size.width / 2, config.canvas_size.height / 2);

		graphics.font = "12px Arial";
		graphics.textAlign = "center";
		graphics.fillText('press space to restart', config.canvas_size.width / 2, 18 + config.canvas_size.height / 2);
	}
}

/**
 * This is the main driver of the game. This is called by the window requestAnimationFrame event.
 * This function calls the update and draw methods at static intervals. That means regardless of
 * how much time passed since the last time this function was called by the window the delta time
 * passed to the draw and update functions will be stable.
 * 
 * @param {Number} curr_time Current time in milliseconds
 */
function loop(curr_time) {
	// convert time to seconds
	curr_time /= 1000;

	// edge case on first loop
	if (last_time == null) {
		last_time = curr_time;
	}

	var delta_time = curr_time - last_time;

	// this allows us to make stable steps in our update functions
	while (delta_time > config.update_rate.seconds) {
		update(config.update_rate.seconds);
		draw(graphics);

		delta_time -= config.update_rate.seconds;
		last_time = curr_time;
		loop_count++;

		/**
		 * Below are the statements for displaying the game statistics.
		 * @param {none}
		 * @return {void}
		 * 
		 */
		

		game_state.innerHTML = `<font color="red"> loop count ${loop_count} <br />
								Time till next Shot: ${player.shotTime.toFixed(2)}<br />
								Time Alive: ${player.timeAlive.toFixed(2)}<br />
								Enemies killed: ${player.enemiesKilled}<br />
								Score: ${player.score}<br />
								Health: ${player.health} <font>`;
		
	}

	window.requestAnimationFrame(loop);
}

/**
 * This is the main driver of the game. This is called by the window requestAnimationFrame event.
 * This function calls the update and draw methods at static intervals. That means regardless of
 * how much time passed since the last time this function was called by the window the delta time
 * passed to the draw and update functions will be stable.
 * 
 */
function start() {
	entities = [];
	queued_entities_for_removal = [];
	player = new Player();

	//entities[0] = player;
	
	//game_state.insertAdjacentHTML('afterend',`<br /> <pre>How to play the Game`)
	enemy_spawner = new spawner()
	
	// collision_handler = your implementation
	collision_handler = new collisionChecker();
}

// start the game
start();

// start the loop
window.requestAnimationFrame(loop);
