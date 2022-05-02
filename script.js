'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const sideBarEl = document.querySelector('.sidebar');
const mapEl = document.getElementById('map');
const modalEl = document.querySelector('.modal');
const modalCloseBtn = document.querySelector('.close-modal');
const helpBtn = document.querySelector('.help-button');

// Workout: id, distance, duration, coords, date
// Running: cadence, pace, calcPace
// Cycling: Elevation gain, speed, calcSpeed

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-5);
  constructor(coords, distance, duration) {
    this.distance = distance;
    this.duration = duration;
    this.coords = coords;
  }

  _setDescription() {
    //prettier-ignore
    const month = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    this.description = `${this.type[0].toUpperCase() + this.type.slice(1)} on ${
      month[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

class App {
  #mapEvent;
  #map;
  #mapZoomLevel = 13;
  #workouts = [];
  constructor() {
    this._getPosition();

    //Get data from local storage
    this._getLocalStorage();
    //On submitting the form, the marker should be visible
    form.addEventListener('submit', this._newWorkout.bind(this));
    this._toggleElevationField();
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getPosition() {
    navigator.geolocation.getCurrentPosition(
      this._loadMap.bind(this),
      function () {
        alert('Sorry, Unable to fetch your location');
      }
    );
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on('click', this._showForm.bind(this));

    //Loading the values once the map is loaded for the locally stored values
    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(event) {
    this.#mapEvent = event; //Just copying the event of this function to the global mapEvent variable
    //On click of the map, the form should open
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
  }

  _toggleElevationField() {
    inputType.addEventListener('change', function () {
      inputElevation
        .closest('.form__row')
        .classList.toggle('form__row--hidden');
      inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    });
  }

  _newWorkout(formEvent) {
    formEvent.preventDefault();

    const checkInputs = (...inputs) =>
      inputs.every(inp => !inp.isFinite && inp > 0);

    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    if (type === 'running') {
      const cadence = +inputCadence.value;

      if (!checkInputs(distance, duration, cadence))
        return alert('The Input values should be positive');

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      if (!checkInputs(distance, duration))
        return alert('The Input values should be positive');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    this._renderWorkoutMarker(workout);

    this._renderWorkout(workout);

    this.#workouts.push(workout);

    this._hideForm();

    //Set local storage to all workouts
    this._setLocalStorage();
    ``;
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(`${workout.description}`)
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `<li class="workout workout--${workout.type}" data-id="${
      workout.id
    }">
    <h2 class="workout__title">${workout.description}</h2>
    <div class="workout__details">
      <span class="workout__icon">${
        workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
      }</span>
      <span class="workout__value">${workout.distance}</span>
      <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">${workout.duration}</span>
      <span class="workout__unit">min</span>
    </div>`;

    if (workout.type === 'running')
      html += `<div class="workout__details">
    <span class="workout__icon">⚡️</span>
    <span class="workout__value">${workout.pace}</span>
    <span class="workout__unit">min/km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">🦶🏼</span>
      <span class="workout__value">${workout.cadence}</span>
      <span class="workout__unit">spm</span>
    </div>
    </li>`;
    else
      html += `<div class="workout__details">
    <span class="workout__icon">⚡️</span>
    <span class="workout__value">${workout.speed}</span>
    <span class="workout__unit">min/km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">🦶🏼</span>
      <span class="workout__value">${workout.elevationGain}</span>
      <span class="workout__unit">spm</span>
    </div>
    </li>`;

    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    //To find the workout in the array using Id in workoutEl

    const workout = this.#workouts.find(val => val.id === workoutEl.dataset.id);

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload(); // location is a pre-defined big objects which contains a lot of methods. Check it later.
  }
}

const obj1 = new App();

//Modal window

// const sideBarEl = document.querySelector('.sidebar');
// const mapEl = document.getElementById('map');
// const modalEl = document.querySelector('.modal');
// const modalCloseBtn = document.querySelector('.close-modal');
// const helpBtn = document.querySelector('.help-button');

const openModal = function () {
  sideBarEl.classList.add('overlay');
  mapEl.classList.add('hidden');
  modalEl.classList.remove('hidden');
};

const closeModal = function (e) {
  if (e.target.closest('.help-button')) return;
  modalEl.classList.add('hidden');
  sideBarEl.classList.remove('overlay');
  mapEl.classList.remove('hidden');
};

helpBtn.addEventListener('click', openModal);
modalCloseBtn.addEventListener('click', closeModal);
sideBarEl.addEventListener('click', closeModal);
mapEl.addEventListener('click', closeModal);
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && sideBarEl.classList.contains('overlay'))
    closeModal(e);
});
