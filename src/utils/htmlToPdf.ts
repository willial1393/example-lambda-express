import {getAbsolutePathOfRelative} from "./Utils";

const fs = require('fs');
const path = require('path');
const pdf = require('html-pdf');
const Handlebars = require('handlebars');

export class HtmlToPdf {

    dirname: string;
    data: any;

    constructor(dirname: string, data: any, watermark?: string) {
        this.dirname = dirname;
        this.data = data;
        this.data.watermark = getAbsolutePathOfRelative(watermark);
    }

    async getHTML() {
        const content = fs.readFileSync(path.join(process.cwd(), this.dirname), 'utf8');
        const template = Handlebars.compile(content);
        return template(this.data);
    }

    async getPDF(): Promise<string> {
        const html = await this.getHTML();
        const options = {
            // https://toolstud.io/photo/dpi.php?width=8.5&width_unit=inch&height=11&height_unit=inch&dpi=150&bleed=0&bleed_unit=mm
            // Papersize Options: http://phantomjs.org/api/webpage/property/paper-size.html
            height: "1208px",        // allowed units: mm, cm, in, px
            width: "968px",            // allowed units: mm, cm, in, px
            format: 'Letter',
            orientation: "portrait", // portrait or landscape
            paginationOffset: 1,       // Override the initial pagination number
            margin: {
                top: '5rem'
            },
            footer: {
                contents: {
                    default: '<span class="footer"><span>{{page}}</span>/<span>{{pages}}</span></span>', // fallback value
                }
            },
            type: "pdf",             // allowed file types: png, jpeg, pdf
            quality: "100"           // only used for types png & jpeg
        };

        const buff: Buffer = await new Promise((resolve, reject) => {
            pdf.create(html, options).toBuffer(function (err, buffer) {
                if (err) {
                    reject(err);
                }
                resolve(buffer);
            });
        });
        return buff.toString('base64');
    }
}
