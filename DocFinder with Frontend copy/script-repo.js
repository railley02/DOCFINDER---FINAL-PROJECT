document.addEventListener('DOMContentLoaded', function () {
    console.log("Script loaded: DOMContentLoaded event fired");


 
   const quezonCityCoords = [14.6760, 121.0437];
   const map = L.map('map').setView(quezonCityCoords, 13);

   L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
       attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
   }).addTo(map);


   let allHospitals = []; 
   const medicalNeedSelect = document.getElementById('medicalNeed');
   const hospitalListElement = document.getElementById('hospitalList');


   let userLocation = null;
   let userMarker = null;
   let routeLine = null;

   setTimeout(() => {
       console.log("Calling map.locate() for initial geolocation");
       map.locate({setView: true, maxZoom: 15});
   }, 500);


   async function fetchHospitalData() {
       try {
           const response = await fetch('./data.json');
           if (!response.ok) {
               throw new Error(`HTTP error! status: ${response.status}`);
           }
           allHospitals = await response.json();
           console.log("Hospitals loaded:", allHospitals);
           displayHospitals(allHospitals);
       } catch (error) {
           console.error("Could not fetch hospital data:", error);
           hospitalListElement.innerHTML = '<li>Error loading hospital data. Please try again later.</li>';
       }
   }


   function navigateToHospital(hospital) {
       if (!userLocation) {
           alert("User location not available.");
           return;
       }
       if (routeLine) {
           map.removeLayer(routeLine);
       }
       routeLine = L.polyline([userLocation, [hospital.latitude, hospital.longitude]], {color: 'blue'}).addTo(map);
       map.fitBounds(routeLine.getBounds());
       const dist = map.distance(userLocation, [hospital.latitude, hospital.longitude]) / 1000; // in km
       alert(`A* (demo): Estimated straight-line distance to ${hospital.name}: ${dist.toFixed(2)} km`);
   }


   function displayHospitals(hospitalsToDisplay) {
       hospitalListElement.innerHTML = '';
       map.eachLayer(function (layer) {
           if (layer instanceof L.Marker && layer !== userMarker) {
               map.removeLayer(layer);
           }
       });
       if (routeLine) {
           map.removeLayer(routeLine);
           routeLine = null;
       }

       if (hospitalsToDisplay.length === 0) {
           hospitalListElement.innerHTML = '<li>No facilities found matching your criteria.</li>';
           return;
       }

       hospitalsToDisplay.forEach(hospital => {
           const listItem = document.createElement('li');
           listItem.innerHTML = `
               <strong>${hospital.name}</strong><br>
               Address: ${hospital.address}<br>
               Services: ${hospital.services.join(', ')}<br>
               Contact: ${hospital.contact} | Hours: ${hospital.hours}
           `;
           listItem.style.cursor = "pointer";
           listItem.onclick = () => navigateToHospital(hospital);
           hospitalListElement.appendChild(listItem);


           if (hospital.latitude && hospital.longitude) {
               const marker = L.marker([hospital.latitude, hospital.longitude]).addTo(map);
               marker.bindPopup(`<b>${hospital.name}</b><br>${hospital.address}<br>Services: ${hospital.services.join(', ')}`);
               marker.on('click', () => navigateToHospital(hospital));
           }
       });
   }


   document.querySelectorAll('.medical-need-button').forEach(button => {
       if (button.hasAttribute('data-need')) {
           button.addEventListener('click', function() {
               const selectedNeed = (button.getAttribute('data-need') ?? '').trim().toLowerCase();
               console.log("Selected Medical Need:", selectedNeed);

               if (!selectedNeed) {
                   alert("Please select a medical need.");
                   displayHospitals(allHospitals);
                   return;
               }

               const filteredHospitals = allHospitals.filter(hospital =>
                   hospital.services.some(service => service.toLowerCase() === selectedNeed)
               );

               console.log("Filtered Hospitals:", filteredHospitals);

               if (filteredHospitals.length === 0) {
                   console.warn(`No hospitals found for the selected need: ${selectedNeed}`);
               }

               displayHospitals(filteredHospitals);
           });
       }
   });


   fetchHospitalData();

   const centerLocationBtn = document.getElementById('centerLocationBtn');
   if (centerLocationBtn) {
       centerLocationBtn.addEventListener('click', function() {
           map.locate({setView: true, maxZoom: 15});
       });
   }

   map.on('locationfound', function(e) {
       userLocation = [e.latitude, e.longitude];
       if (userMarker) {
           map.removeLayer(userMarker);
       }
       userMarker = L.marker(userLocation, {title: "You", icon: L.icon({
           iconUrl: 'https://cdn-icons-png.flaticon.com/512/149/149060.png',
           iconSize: [32, 32],
           iconAnchor: [16, 32]
       })}).addTo(map).bindPopup("Your Location").openPopup();
   });

   map.on('locationerror', function(e) {
       alert("Could not get your location. Please allow location access and try again.\nError: " + e.message);
   });

});

