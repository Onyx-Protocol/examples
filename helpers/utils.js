module.exports = {
  formatNumber(number, maximumFractionDigits = 20) {
    return new Intl.NumberFormat('en-EN', {
      // maximumSignificantDigits: 21,
      maximumFractionDigits,
    }).format(number);
  },
};
