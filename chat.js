class Chat {
    constructor(el, collectionName) {
        if (!collectionName) {
            throw 'collectionName is required';
        }

        this.startedAt = Math.trunc(Date.now() / 1000);
        this.el = el;
        const db = firebase.firestore();
        this.collection = db.collection(collectionName);

        this.mute = el.querySelector('input.mute');
        this.user = el.querySelector('input.user');
        this.receiver = el.querySelector('select.receiver');
        this.message = el.querySelector('textarea.message');
        this.starContainer = el.querySelector('.stars');
        this.msgContainer = el.querySelector('.messages');
        this.receivers = [];
        this.messages = [];

        this.initializeSound();
        this.listenCollection();
        el.querySelector('form.input-form').addEventListener('submit', this.onSubmit.bind(this));
        this.message.addEventListener('keydown', this.onKeydownInMessage.bind(this));
        el.querySelector('button.download').addEventListener('click', this.onDownloadBtnClick.bind(this));
        el.querySelector('button.read-all').addEventListener('click', this.onReadAllBtnClick.bind(this));
        el.querySelector('button.raise-hand').addEventListener('click', this.onRaiseHandBtnClick.bind(this));

        const handler = this.onMsgContainerClick.bind(this);
        this.starContainer.addEventListener('click', handler);
        this.msgContainer.addEventListener('click', handler);
    }

    initializeSound() {
        this.sound = new Audio('message.mp3');
    }

    listenCollection() {
        this.collection.orderBy('createdAt').onSnapshot({
            includeMetadataChanges: true,
        }, snapshot => {
            const changes = snapshot.docChanges().filter(change => {
                return (change.type === 'added' && change.doc.data().createdAt)
                    || change.type === 'modified';
            });
            changes.forEach(change => {
                const data = change.doc.data();
                this.addReceiver(data.user);

                const formattedData = this.formatMessage(data);
                this.messages.push(formattedData);
                const el = this.createMessageEl(formattedData);
                el.setAttribute('data-id', change.doc.id);
                this.msgContainer.insertBefore(el, this.msgContainer.firstChild);

                if (!this.mute.checked) {
                    this.sound.play();
                }
            });
        }, error => {
            alert(`Error listening collection: ${error}`);
        });
    }

    formatMessage(data) {
        return {
            formattedUser: (data.user || '(匿名)') + (data.receiver ? ` => ${data.receiver}` : ''),
            formattedTime: this.formatDate(data.createdAt.seconds),
            createdAt: data.createdAt,
            message: data.message,
        };
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

    addReceiver(user) {
        if (this.user.value === user) {
            return;
        }
        if (this.receivers.includes(user)) {
            return;
        }
        this.receivers.push(user);

        const option = document.createElement('option');
        option.text = user;
        this.receiver.appendChild(option);
    }

    createMessageEl(data) {
        const containerDiv = document.createElement('div');
        const header = document.createElement('header');
        const userDiv = document.createElement('div');
        const timeDiv = document.createElement('div');
        const starDiv = document.createElement('div');
        const pre = document.createElement('pre');

        containerDiv.classList.add('message');
        if (data.createdAt.seconds > this.startedAt) {
            containerDiv.classList.add('unread');
        }
        userDiv.classList.add('user');
        timeDiv.classList.add('time');
        starDiv.classList.add('star');

        userDiv.textContent = data.formattedUser;
        timeDiv.textContent = data.formattedTime;
        starDiv.textContent = '☆';
        pre.textContent = data.message;
        pre.innerHTML = this.urlToAnchor(pre.innerHTML);

        header.appendChild(userDiv);
        header.appendChild(timeDiv);
        header.appendChild(starDiv);
        containerDiv.appendChild(header);
        containerDiv.appendChild(pre);
        return containerDiv;
    }

    urlToAnchor(text) {
        return text.replace(/https?:\/\/\S+/ig, '<a href="$&" target="_blank">$&</a>');
    }

    onSubmit(event) {
        event.preventDefault();
        const [user, message] = [this.user.value, this.message.value];
        if (user.length === 0) {
            alert('なまえを入力してください。');
            return;
        }
        if (message.length === 0) {
            alert('メッセージを入力してください。');
            return;
        }

        this.post(user, this.receiver.value, message).then(docRef => {
            this.message.value = '';
        }).catch(error => {
            alert(`Error adding a message: ${error}`);
        });
    }

    post(user, receiver, message) {
        return this.collection.add({
            user,
            receiver,
            message,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
    }

    onKeydownInMessage(event) {
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            event.target.closest('form').dispatchEvent(new Event('submit'));
        }
    }

    onDownloadBtnClick(event) {
        const text = this.messages.map(data => {
            return [data.formattedTime, data.formattedUser, data.message].join('\t');
        }).join('\n');

        const a = document.createElement('a');
        const blob = new Blob([text], {type: 'text/plain'});
        const url = window.URL.createObjectURL(blob);
        a.href = url;
        a.download = `chat-${this.collection.id}.txt`;
        a.click();
        window.URL.revokeObjectURL(url);
    }

    onReadAllBtnClick(event) {
        this.el.querySelectorAll('.message.unread').forEach(el => {
            el.classList.remove('unread');
        });
    }

    onRaiseHandBtnClick(event) {
        const user = this.user.value;
        if (user.length === 0) {
            alert('なまえを入力してください。');
            return;
        }
        const message = `${user}さんが手を挙げました。`;
        this.post(user, this.receiver.value, message);
    }

    onMsgContainerClick(event) {
        if (!event.target.classList.contains('star')) {
            return;
        }

        const star = event.target;
        const id = star.closest('.message').getAttribute('data-id');
        if (star.classList.contains('stared')) {
            this.onUnStar(id);
        } else {
            this.onStar(id);
        }
    }

    onStar(id) {
        const message = this.msgContainer.querySelector(`[data-id="${id}"]`);
        const star = message.querySelector('.star');
        star.classList.add('stared');
        star.textContent = '★';
        this.starContainer.appendChild(message.cloneNode(true));
    }

    onUnStar(id) {
        const message = this.starContainer.querySelector(`[data-id="${id}"]`);
        this.starContainer.removeChild(message);

        const star = this.msgContainer.querySelector(`[data-id="${id}"] .star`);
        star.classList.remove('stared');
        star.textContent = '☆';
    }
}
