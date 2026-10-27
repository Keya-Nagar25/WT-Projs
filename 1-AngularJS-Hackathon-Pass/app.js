// HackPass - AngularJS registration & login demo
// Users are stored in the browser's localStorage (no backend needed for this lab).

angular.module('hackPassApp', [])

  // Service: everything related to storing / reading users
  .factory('UserService', function () {
    var KEY = 'hackpass_users';
    var SESSION = 'hackpass_session';

    function load() {
      try { return JSON.parse(localStorage.getItem(KEY)) || []; }
      catch (e) { return []; }
    }
    function save(users) {
      try { localStorage.setItem(KEY, JSON.stringify(users)); } catch (e) {}
    }

    return {
      all: load,
      find: function (username) {
        username = (username || '').toLowerCase();
        return load().filter(function (u) { return u.username.toLowerCase() === username; })[0];
      },
      add: function (user) {
        var users = load();
        users.push(user);
        save(users);
      },
      setSession: function (username) {
        try {
          if (username) sessionStorage.setItem(SESSION, username);
          else sessionStorage.removeItem(SESSION);
        } catch (e) {}
      },
      getSession: function () {
        try { return sessionStorage.getItem(SESSION); } catch (e) { return null; }
      }
    };
  })

  .controller('AuthController', function (UserService) {
    var vm = this;

    vm.tracks = ['Web Development', 'AI / ML', 'Mobile Apps', 'Cyber Security', 'Open Innovation'];
    vm.view = 'register';
    vm.reg = { track: vm.tracks[0] };
    vm.cred = {};
    vm.users = UserService.all();
    vm.currentUser = UserService.find(UserService.getSession()) || null;

    vm.switchView = function (view) {
      vm.view = view;
      vm.errorMsg = '';
      vm.successMsg = '';
    };

    vm.checkUsername = function () {
      vm.usernameTaken = !!UserService.find(vm.reg.username);
    };

    // Simple password-strength score out of 4
    vm.strength = function () {
      var p = vm.reg.password || '';
      var score = 0;
      if (p.length >= 8) score++;
      if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
      if (/\d/.test(p)) score++;
      if (/[^A-Za-z0-9]/.test(p)) score++;
      var levels = [
        { label: 'Very weak', cls: 'weak' },
        { label: 'Weak', cls: 'weak' },
        { label: 'Fair', cls: 'fair' },
        { label: 'Good', cls: 'good' },
        { label: 'Strong', cls: 'strong' }
      ];
      var lvl = levels[score];
      return { label: lvl.label, cls: lvl.cls, pct: Math.max(10, score * 25) };
    };

    vm.register = function (form) {
      vm.errorMsg = '';
      if (form.$invalid || vm.reg.password !== vm.reg.confirm) {
        vm.errorMsg = 'Please fix the errors in the form.';
        return;
      }
      if (UserService.find(vm.reg.username)) {
        vm.errorMsg = 'Username already exists.';
        return;
      }
      UserService.add({
        firstName: vm.reg.firstName,
        lastName: vm.reg.lastName,
        username: vm.reg.username,
        password: vm.reg.password, // plain text only because this is a classroom demo
        track: vm.reg.track,
        passId: 'CS26-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
        registeredOn: new Date().toISOString()
      });
      vm.users = UserService.all();
      vm.reg = { track: vm.tracks[0] };
      vm.switchView('login');
      vm.successMsg = 'Registration successful! Please log in.';
    };

    vm.login = function (form) {
      vm.errorMsg = '';
      vm.successMsg = '';
      if (form.$invalid) return;
      var user = UserService.find(vm.cred.username);
      if (!user || user.password !== vm.cred.password) {
        vm.errorMsg = 'Invalid username or password.';
        return;
      }
      vm.currentUser = user;
      UserService.setSession(user.username);
      vm.cred = {};
    };

    vm.logout = function () {
      vm.currentUser = null;
      UserService.setSession(null);
      vm.switchView('login');
    };

    vm.initials = function (u) {
      return (u.firstName[0] + u.lastName[0]).toUpperCase();
    };

    // Turns the pass ID into a fake barcode (list of bar widths)
    vm.barcode = function (id) {
      var bars = [];
      for (var i = 0; i < id.length; i++) {
        var c = id.charCodeAt(i);
        bars.push(1 + (c % 4), 1 + ((c >> 2) % 3));
      }
      return bars;
    };
  });
