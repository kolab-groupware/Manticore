'use strict';

describe('Controller: ExportButtonCtrl', function () {

  // load the controller's module
  beforeEach(module('manticoreApp'));

  var ExportButtonCtrl, scope;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($controller, $rootScope) {
    scope = $rootScope.$new();
    ExportButtonCtrl = $controller('ExportButtonCtrl', {
      $scope: scope
    });
  }));

  it('should ...', function () {
    expect(1).toEqual(1);
  });
});
