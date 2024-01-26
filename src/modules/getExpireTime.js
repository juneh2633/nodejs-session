module.exports = () => {
    const today = new Date();
    const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    let time = Math.floor(midnight - today) / 1000;
    return Math.floor((midnight - today) / 1000);
};
