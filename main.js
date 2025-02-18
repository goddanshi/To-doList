
let taskContainer = document.getElementById("demo");

function addTask() {
    let inputValue = document.getElementById("text1").value.trim();
    if (inputValue === "") {
        alert("Введите текст задачи!");
        return;
    }

    let label = document.createElement("label");
    label.style.display = "flex";
    label.style.alignItems = "center";
    label.style.margin = "5px 0";

    let checkbox = document.createElement("input");
    checkbox.type = "checkbox";

    let textNode = document.createTextNode(" " + inputValue);

    label.appendChild(checkbox);
    label.appendChild(textNode);

    checkbox.addEventListener("change", function() {
        if (checkbox.checked) {
            label.style.textDecoration = "line-through"; // Задача зачёркивается
            taskContainer.appendChild(label); // Перемещаем в конец списка
        } else {
            label.style.textDecoration = "none";
        }
    });

    taskContainer.appendChild(label);
}