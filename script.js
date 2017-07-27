window.Trello.authorize({
        type: 'popup',
        name: 'Novice group email list',
        scope: {
                read: 'true',
                write: 'true' },
                expiration: 'never',
                success: authenticationSuccess,
                error: authenticationFailure
});


function authenticationSuccess() {
        console.log('authenticated');
        window.Trello.get('/members/me/boards').then(function(boards) {
                boards.filter(b=>b.name == 'Tuesday Evening Groups').forEach(processBoard)
        });
}

function authenticationFailure() {
        console.log('failed to authenticate');
}

function processBoard(b) {
        console.log('processing board',b);
        var url = 'boards/'+b.id+'/lists';
        window.Trello.get(url).then(processLists);
}

function processLists(lists) {
        console.log(lists);
        var isEmailList = l => l.name === 'Email Lists';
        var email = lists.filter(isEmailList)[0];

        function include(l) {
                return (!isEmailList(l));
        }

        var cardDel = processEmail(email);

        cardDel.then(function() {
                lists.filter(include).forEach(processList);
        });

        function processEmail(l) {
                return window.Trello.get('/lists/'+l.id+'/cards').then(function(cards) {
                        var dels = cards.map(c => window.Trello.del('/cards/'+c.id));
                        return Promise.all(dels);
                });
        }

        function processList(l) {
                window.Trello.get('/lists/'+l.id+'/cards').then(function(cards) {
                        var emails = [];
                        cards.forEach(function(c) {
                                var email = contactDetailsFromCard(c);
                                if(email) {
                                        emails.push(email);
                                }
                        });
                        console.log(l.name, emails);
                        if(emails.length) {
                                createCard(l.name, emails.map(x=>x.displayEmail).join('\n'), l.pos);
                        }
                });

                function createCard(name, desc, pos) {
                        json = {
                                name : name,
                                desc : desc,
                                idList : email.id,
                                pos : pos
                        };
                        console.log('creating',json);
                        window.Trello.post('/cards', json);
                }
        }
}

function ContactDetails(email, name) {
        this.email = email;
        this.name = name;

        Object.defineProperty(this, 'displayEmail', {
                get : function() {
                        var em;
                        if(this.name) {
                                em = this.name.trim() + ' <'+this.email+'>';
                        }
                        else {
                                em = this.email;
                        }
                        return '    '+em;
                }
        });
}


function contactDetailsFromCard(c) {
        var nre = /([^<]*)<([^< ]*@[^> ]*)/;
        var m = nre.exec(c.name);
        if(m) {
                return new ContactDetails(m[2], m[1]);
        }
        var r = /([^< ",]*@[^> ",]*)/; 
        m = r.exec(c.name);
        if(m) {
                return new ContactDetails(m[1]);
        }
}


function a() {
        var self = this;
        this.p = new Promise(function(res, rej) {
                self.accept = res;
                self.fail = rej;
        });

}
