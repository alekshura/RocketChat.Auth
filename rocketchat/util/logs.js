import moment from 'moment';
import intercept from "intercept-stdout";

intercept(function(text) {
    return moment().format(process.env.LOGS_TS_FORMAT) + ' ' + text;
});