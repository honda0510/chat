class Chat {
    constructor(el, collectionName) {
        this.startedAt = Math.trunc(Date.now() / 1000);
        this.el = el;
        const db = firebase.firestore();
        this.collection = db.collection(collectionName || 'messages');
        this.mute = el.querySelector('input.mute');
        this.messagesDiv = el.querySelector('.messages');

        this.initializeSound();
        this.listenCollection();
        this.listenForm();
        this.listenReadAllButton();
    }

    listenCollection() {
        this.collection.orderBy('createdAt').onSnapshot({
            includeMetadataChanges: true,
        }, snapshot => {
            snapshot.docChanges().filter(change => {
                return (change.type === 'added' && change.doc.data().createdAt)
                    || change.type === 'modified';
            }).forEach(change => {
                const el = this.createMessageEl(change.doc.data());
                this.messagesDiv.insertBefore(el, this.messagesDiv.firstChild);
                if (!this.mute.checked) {
                    this.sound.play();
                }
            });
        }, error => {
            alert(`Error listening collection: ${error}`);
        });
    }

    createMessageEl(data) {
        const containerDiv = document.createElement('div');
        const header = document.createElement('header');
        const userDiv = document.createElement('div');
        const timeDiv = document.createElement('div');
        const pre = document.createElement('pre');

        containerDiv.classList.add('message');
        if (data.createdAt.seconds > this.startedAt) {
            containerDiv.classList.add('unread');
        }
        userDiv.classList.add('user');
        timeDiv.classList.add('time');

        userDiv.textContent = data.user || '(匿名)';
        timeDiv.textContent = this.formatDate(data.createdAt.seconds);
        pre.textContent = data.message;
        pre.innerHTML = this.urlToAnchor(pre.innerHTML);

        header.appendChild(userDiv);
        header.appendChild(timeDiv);
        containerDiv.appendChild(header);
        containerDiv.appendChild(pre);
        return containerDiv;
    }

    formatDate(seconds) {
        const d = new Date(seconds * 1000);
        return d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate()
            + '(' + this.jpDay(d.getDay()) + ')'
            + ' ' + d.getHours()
            + ':' + d.getMinutes().toString().padStart(2, '0')
            + ':' + d.getSeconds().toString().padStart(2, '0');
    }

    jpDay(day) {
        switch (day) {
            case 0:
                return '日';
            case 1:
                return '月';
            case 2:
                return '火';
            case 3:
                return '水';
            case 4:
                return '木';
            case 5:
                return '金';
            case 6:
                return '土';
            default:
                throw new RangeError('The argument must be between 0 and 6.');
        }
    }

    urlToAnchor(text) {
        return text.replace(/https?:\/\/\S+/ig, '<a href="$&" target="_blank">$&</a>');
    }

    initializeSound() {
        this.sound = new Audio('message.mp3');
    }

    listenForm() {
        const form = this.el.querySelector('form.input-form');
        const userNameArea = form.querySelector('input.user');
        const messageArea = form.querySelector('textarea.message');

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
        });

        messageArea.addEventListener('keydown', event => {
            if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                form.dispatchEvent(new Event('submit'));
            }
        });
    }

    post(user, message) {
        return this.collection.add({
            user,
            message,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
    }

    listenReadAllButton() {
        const button = this.el.querySelector('button.read-all');
        button.addEventListener('click', event => {
            this.el.querySelectorAll('.message.unread').forEach(el => {
                el.classList.remove('unread');
            });
        });
    }
}
