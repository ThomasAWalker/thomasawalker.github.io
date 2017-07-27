window.Trello.authorize({
        type: 'popup',
        name: 'Getting Started Application',
        scope: {
                read: 'true',
                write: 'true' },
                expiration: 'never',
                success: authenticationSuccess,
                error: authenticationFailure
});

function processBoard(b) {
        console.log('processing board',b);
        var url = 'boards/'+b.id+'/lists';
        window.Trello.get(url).then(processLists);
}

function processLists(lists) {
        console.log(lists);
        var isEmail = l => l.name === 'Email Lists';
        var email = lists.filter(isEmail)[0];

        function include(l) {
                return (!isEmail(l));
        }

        var cardDel = processEmail(email);

        cardDel.then(function() {
                lists.filter(include).forEach(processList);
        });

        function processEmail(l) {
                return window.Trello.get('/lists/'+l.id+'/cards').then(function(cs) {
                        var dels = cs.map(c => window.Trello.del('/cards/'+c.id));
                        return Promise.all(dels);
                });
        }

        function processList(l) {
                window.Trello.get('/lists/'+l.id+'/cards').then(function(cs) {
                        var emails = [];
                        cs.forEach(function(c) {
                                var email = emailFromCard(c);
                                if(email) {
                                        emails.push(email);
                                }
                        });
                        console.log(l.name, emails);
                        if(emails.length) {
                                createCard(l.name, emails.join('\n'), l.pos);
                        }
                });
        }

        function createCard(name, desc, pos) {
                json = {
                        name : name,
                        desc : desc,
                        idList : email.id,
                        pos : pos
                };
                window.Trello.post('/cards', json);
        }
}

function emailFromCard(c) {
        var r = /([^< ",]*@[^> ",]*)/; 
        var m = r.exec(c.name);
        if(m) {
                return m[0];
        }
}

function authenticationSuccess() {
        console.log('succ');
        window.Trello.get('/members/me/boards').then(function(boards) {
                boards.filter(b=>b.name == 'Tuesday Evening Groups').forEach(processBoard)
        });
}

function authenticationFailure() {
        console.log('fail');
}
