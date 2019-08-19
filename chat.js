class Chat {
    constructor(el, collectionName) {
        this.el = el;
        const db = firebase.firestore();
        this.collection = db.collection(collectionName || 'messages');
        this.messagesDiv = el.querySelector('.messages');

        this.listenCollection();
        this.listenForm();
    }

    listenCollection() {
        this.collection.orderBy('createdAt').onSnapshot({
            includeMetadataChanges: true,
        }, snapshot => {
            snapshot.docChanges().filter(change => {
                return (change.type === 'added' && change.doc.data().createdAt)
                    || change.type === 'modified'
            }).forEach(change => {
                this.onAdd(change.doc.data());
            });
        }, error => {
            alert(`Error listening collection: ${error}`);
        });
    }

    onAdd(data) {
        const containerDiv = document.createElement('div');
        const userDiv = document.createElement('div');
        const timeDiv = document.createElement('div');
        const pre = document.createElement('pre');

        containerDiv.classList.add('message');
        userDiv.classList.add('user');
        timeDiv.classList.add('time');

        userDiv.textContent = data.user || '(匿名)';
        timeDiv.textContent = this.formatDate(data.createdAt.seconds);
        pre.textContent = data.message;
        
        containerDiv.appendChild(userDiv);
        containerDiv.appendChild(timeDiv);
        containerDiv.appendChild(pre);
        this.messagesDiv.insertBefore(containerDiv, this.messagesDiv.firstChild);
    }

    formatDate(seconds) {
        const d = new Date(seconds * 1000);
        return d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate()
            + ' ' + d.getHours()
            + ':' + d.getMinutes().toString().padStart(2, '0')
            + ':' + d.getSeconds().toString().padStart(2, '0');
    }

    listenForm() {
        const form = this.el.querySelector('.input-form');
        const userNameArea = form.querySelector('.user');
        const messageArea = form.querySelector('.message');

        form.addEventListener('submit', event => {
            event.preventDefault();
            const [user, message] = [userNameArea.value, messageArea.value];
            if (message.length === 0) {
                return;
            }

            this.post(user, message).then(docRef => {
                messageArea.value = '';
            }).catch(error => {
                alert(`Error adding a message: ${error}`);
            });
        })
    }

    post(user, message) {
        return this.collection.add({
            user,
            message,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
    }
}
