
function start() {
        updateStatus('authenticating');
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
}

function updateStatus(stat) {
        $('#status').text(stat);
}


function authenticationSuccess() {
        console.log('authenticated');
        window.Trello.get('/members/me/boards').then(function(boards) {
                updateStatus('got boards');
                boards.filter(b=>b.name == 'Tuesday Evening Groups').forEach(processBoard)
        });
}

function authenticationFailure() {
        console.log('failed to authenticate');
}

function processBoard(b) {
        updateStatus('processing board:'+b.name);
        var url = 'boards/'+b.id+'/lists';
        window.Trello.get(url).then(processLists);
}

function processLists(lists) {
        console.log(lists);
        var isEmailList = l => l.name === 'Email Lists';
        var isGroupList = l => l.name === 'Groups';
        var email = lists.filter(isEmailList)[0];
        var groups = lists.filter(isGroupList)[0];
        var listNames = lists.map(l=>l.name);

        //TODO bad
        var listEmails = {};


        function include(l) {
                return (!isEmailList(l) && !isGroupList(l));
        }

        var cardDel = processEmail(email);

        cardDel.then(function() {
                var pro = lists.filter(include).map(processList);
                console.log(pro);
                return Promise.all(pro).then(function() {
                        console.log('list Emails',listEmails);
                        processGroups(groups);
                });
        });

        var emailCards = {};

        function processEmail(l) {
                return window.Trello.get('/lists/'+l.id+'/cards').then(function(cards) {
                        var toDelete = [];
                        cards.forEach(function(c) {
                                if(listNames.indexOf(c.name) == -1) {
                                        console.log('deleting',c.name);
                                        toDelete.push(c);
                                } else {
                                        emailCards[c.name] = c;
                                }
                        });
                        var dels = toDelete.map(c => window.Trello.del('/cards/'+c.id));
                        return Promise.all(dels);
                });
        }

        function processGroups(l) {
                return window.Trello.get('/lists/'+l.id+'/cards').then(function(cards) {
                        cards.forEach(function(c) {
                                var name = c.name;
                                var groups = c.desc.split('\n');
                                var emails = [];
                                groups.forEach(function(g) {
                                        var gEm = listEmails[g];
                                        console.log(g, gEm);
                                        if(gEm) {
                                                emails = emails.concat(gEm);
                                        }
                                });
                                console.log(c.name,emails);
                                createCard(c.name, emails.map(x=>x.displayEmail).sort().join('\n'), l.pos);
                        });
                });
        }

        function processList(l) {
                return window.Trello.get('/lists/'+l.id+'/cards').then(function(cards) {
                        var emails = [];
                        cards.forEach(function(c) {
                                var email = contactDetailsFromCard(c);
                                if(email) {
                                        emails.push(email);
                                }
                        });
                        console.log(l.name, emails);
                        if(emails.length) {
                                listEmails[l.name] = emails;
                                if(emailCards[l.name]) {
                                        console.log('updating',l.name);
                                        updateCard(emailCards[l.name], emails.map(x=>x.displayEmail).sort().join('\n'), l.pos);
                                }
                                else {
                                        console.log('creating new card',l.name);
                                        createCard(l.name, emails.map(x=>x.displayEmail).sort().join('\n'), l.pos);
                                }
                        }
                        else if(emailCards[l.name]) {
                                //delete empty card
                                console.log('deleting empty card',l.name);
                                window.Trello.del('/cards/'+emailCards[l.name].id);
                        }
                });

                function updateCard(card, desc, pos) {
                        json = {
                                desc : desc,
                                pos : pos
                        };
                        if(card.desc == json.desc) {
                                console.log('no change in card',card);
                        }
                        else {
                                console.log('updating',card, json);
                                window.Trello.put('/cards/'+card.id, json);
                        }
                }
        }

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

start();
