
const map = L.map('map').setView([-34.6037, -58.3816], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

let currentLatLng = null;
const denuncias = [];
const marcadores = [];
const capas = [];

const colores = {
  "Robo": "red",
  "Accidente": "orange",
  "Disturbios": "purple",
  "Venta de droga": "green"
};

map.on('click', function(e) {
  currentLatLng = e.latlng;
});

function guardarDenuncia() {
  if (!currentLatLng) return alert("Hacé clic en el mapa primero.");
  const tipo = document.getElementById('tipo').value;
  const resumen = document.getElementById('resumen').value;
  const fecha = new Date().toLocaleString();
  const lat = currentLatLng.lat.toFixed(6);
  const lng = currentLatLng.lng.toFixed(6);

  const icon = L.icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${colores[tipo]}.png`,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png"
  });

  const marker = L.marker([lat, lng], { icon }).addTo(map)
    .bindPopup(`<strong>${tipo}</strong><br>${resumen}<br>${fecha}`);
  marker._id = denuncias.length;

  denuncias.push({ tipo, resumen, fecha, lat, lng });
  marcadores.push(marker);
  agregarFila(denuncias.length - 1);
  currentLatLng = null;
  document.getElementById('resumen').value = '';
}

function agregarFila(index) {
  const tabla = document.querySelector("#tabla tbody");
  const d = denuncias[index];
  const fila = document.createElement("tr");
  fila.innerHTML = `
    <td class="select-col"><input type="checkbox" class="fila-checkbox" data-id="${index}"></td>
    <td>${d.tipo}</td>
    <td>${d.resumen}</td>
    <td>${d.fecha}</td>
    <td>${d.lat}</td>
    <td>${d.lng}</td>
    <td><button onclick="centrar(${index})">Ir</button></td>
    <td><button onclick="eliminar(${index})">X</button></td>
  `;
  tabla.appendChild(fila);
}

function centrar(index) {
  const d = denuncias[index];
  map.setView([d.lat, d.lng], 16);
  marcadores[index].openPopup();
}

function eliminar(index) {
  if (confirm("¿Eliminar esta denuncia?")) {
    map.removeLayer(marcadores[index]);
    denuncias[index] = null;
    marcadores[index] = null;
    actualizarTabla();
  }
}

function actualizarTabla() {
  const tbody = document.querySelector("#tabla tbody");
  tbody.innerHTML = "";
  denuncias.forEach((d, i) => {
    if (d) agregarFila(i);
  });
}

function seleccionarTodos(origen) {
  const checkboxes = document.querySelectorAll('.fila-checkbox');
  const marcar = origen?.checked ?? true;
  checkboxes.forEach(c => c.checked = marcar);
}

function descargarCSV() {
  const datosValidos = denuncias.filter(d => d !== null);
  let csv = "Tipo,Resumen,Fecha,Latitud,Longitud\n";
  datosValidos.forEach(d => {
    csv += `"${d.tipo}","${d.resumen}","${d.fecha}",${d.lat},${d.lng}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "denuncias.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function cerrarModal() {
  document.getElementById('modal').style.display = 'none';
}

function cerrarModalTabla() {
  document.getElementById('modalTabla').style.display = 'none';
}

function agregarCapa(nombre, capa) {
  capas.push({ nombre, capa });
  actualizarListadoCapas();
}

function actualizarListadoCapas() {
  const contenedor = document.getElementById("capasCargadas");
  contenedor.innerHTML = "";
  capas.forEach((item, i) => {
    const div = document.createElement("div");
    div.innerHTML = `
      <strong>${item.nombre}</strong>
      <button onclick="verTabla(${i})">📋</button>
      <button onclick="eliminarCapa(${i})">🗑</button>
    `;
    contenedor.appendChild(div);
  });
}

function eliminarCapa(index) {
  const item = capas[index];
  if (item) {
    map.removeLayer(item.capa);
    capas.splice(index, 1);
    actualizarListadoCapas();
  }
}

function verTabla(index) {
  const item = capas[index];
  if (!item) return;

  const features = item.capa.toGeoJSON().features;
  if (!features.length) return alert("No hay datos para mostrar.");

  const keys = Object.keys(features[0].properties);
  const thead = document.getElementById("theadTabla");
  const tbody = document.getElementById("tbodyTabla");
  const titulo = document.getElementById("tituloTabla");

  titulo.textContent = `Tabla de atributos - ${item.nombre}`;
  thead.innerHTML = "";
  tbody.innerHTML = "";

  keys.forEach(k => {
    const th = document.createElement("th");
    th.textContent = k;
    thead.appendChild(th);
  });

  features.forEach((f, idx) => {
    const tr = document.createElement("tr");
    tr.addEventListener("click", () => {
      const coords = f.geometry.type === "Point" ? f.geometry.coordinates.reverse() : f.geometry.type === "Polygon" ? f.geometry.coordinates[0][0].reverse() : null;
      if (coords) map.setView(coords, 16);
    });
    keys.forEach(k => {
      const td = document.createElement("td");
      td.textContent = f.properties[k] ?? "";
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  document.getElementById("modalTabla").style.display = "flex";
}

document.getElementById('file').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(event) {
    const contenido = event.target.result;
    const nombre = file.name;

    if (file.name.endsWith(".geojson")) {
      try {
        const geojson = JSON.parse(contenido);
        const capa = L.geoJSON(geojson).addTo(map);
        map.fitBounds(capa.getBounds());
        agregarCapa(nombre, capa);
      } catch (err) {
        alert("Error al leer GeoJSON");
      }
    } else if (file.name.endsWith(".kml")) {
      const capa = omnivore.kml.parse(contenido);
      capa.on("ready", function() {
        map.fitBounds(capa.getBounds());
      }).addTo(map);
      agregarCapa(nombre, capa);
    } else {
      alert("Archivo no soportado. Usa .geojson o .kml");
    }
  };
  reader.readAsText(file);
});
