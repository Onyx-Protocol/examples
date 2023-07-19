module.exports = {
  formatNumber(number, maximumFractionDigits = 20) {
    return new Intl.NumberFormat('en-EN', {
      maximumFractionDigits,
    }).format(number);
  },
};
