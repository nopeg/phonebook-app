const API_URL = '/contacts';

async function loadContacts() {
    try {
        const response = await fetch(API_URL);
        const contacts = await response.json();
        displayContacts(contacts);
    } catch (error) {
        console.error('Ошибка загрузки контактов:', error);
    }
}

function displayContacts(contacts) {
    const contactsList = document.getElementById('contactsList');
    contactsList.innerHTML = '<h2>Контакты</h2>';
    
    if (contacts.length === 0) {
        contactsList.innerHTML += '<p>Контактов нет</p>';
        return;
    }
    
    contacts.forEach(contact => {
        const contactDiv = document.createElement('div');
        contactDiv.className = 'contact';
        contactDiv.innerHTML = `
            <strong>${escapeHtml(contact.name)}</strong>: ${escapeHtml(contact.phone)}
            <button onclick="deleteContact('${contact._id}')">Удалить</button>
        `;
        contactsList.appendChild(contactDiv);
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function addContact() {
    const nameInput = document.getElementById('nameInput');
    const phoneInput = document.getElementById('phoneInput');
    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    
    if (!name || !phone) {
        alert('Заполните все поля');
        return;
    }

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, phone })
        });

        if (response.ok) {
            nameInput.value = '';
            phoneInput.value = '';
            loadContacts();
        }
    } catch (error) {
        console.error('Ошибка добавления контакта:', error);
        alert('Ошибка при добавлении контакта');
    }
}

async function deleteContact(id) {
    if (!confirm('Удалить контакт?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            loadContacts();
        }
    } catch (error) {
        console.error('Ошибка удаления контакта:', error);
        alert('Ошибка при удалении контакта');
    }
}

document.addEventListener('DOMContentLoaded', loadContacts);