'use strict';

describe('Controller: DocumentListCtrl', function () {

  // load the controller's module
  beforeEach(module('manticoreApp'));

  var DocumentListCtrl, scope;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($controller, $rootScope) {
    scope = $rootScope.$new();
    DocumentListCtrl = $controller('DocumentListCtrl', {
      $scope: scope
    });
  }));

  it('should ...', function () {
    expect(1).toEqual(1);
  });
});
