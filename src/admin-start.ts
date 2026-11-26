import('./admin-entry').catch(error => {
  console.error('Admin startup failed:',error);
  window.dispatchEvent(new Event('sanco-admin-load-error'));
});
