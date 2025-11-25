// Mostrar/ocultar formularios
function openForm(id){
    document.querySelectorAll('.form-box').forEach(f => f.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

// Login Discord
function loginDiscord(){
    window.location.href = "/login";
}

// Inicializar Firebase
const firebaseConfig = {
  apiKey: "AIzaSyC0YIK-ObjFZ8GxaIezNIIbfZkNGnUauSQ",
  authDomain: "roleplaydb-bdd11.firebaseapp.com",
  projectId: "roleplaydb-bdd11"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Guardar registro (antecedente o multa)
function guardarRegistro(formId, tipo){
    const form = document.getElementById(formId);
    const inputs = form.querySelectorAll("input");
    const data = { tipo: tipo };
    inputs.forEach(i=>{ if(i.value) data[i.placeholder.toLowerCase()] = i.value; });
    db.collection(tipo+'s').add(data).then(()=> cargarTabla(tipo));
}

// Cargar tabla
function cargarTabla(tipo){
    const tabla = document.getElementById("tabla-"+tipo);
    if(!tabla) return;
    db.collection(tipo+'s').get().then(snap=>{
        tabla.innerHTML = `<tr><th>Discord</th><th>Nombre</th><th>Apellido</th><th>RUT</th><th>Articulos</th><th>Monto</th><th>Valido</th></tr>`;
        snap.forEach(doc=>{
            const d = doc.data();
            tabla.innerHTML += `<tr>
                <td>${d.discord||""}</td>
                <td>${d.nombre||""}</td>
                <td>${d.apellido||""}</td>
                <td>${d.rut||""}</td>
                <td>${d.articulos||""}</td>
                <td>${d.monto||""}</td>
                <td>${d.valido||"Sí"}</td>
            </tr>`;
        });
    });
}

window.addEventListener('load', ()=>{
    cargarTabla('antecedente');
    cargarTabla('multa');
});
