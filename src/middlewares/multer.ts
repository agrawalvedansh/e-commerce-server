import multer from 'multer'
import path from 'path';
import {v4 as uuid} from 'uuid'

const storage = multer.diskStorage({
    destination(req, file, callback) {
        callback(null, "uploads");
    },
    filename(req, file, callback) {
        const id = uuid();
        const filename = `${id}${path.extname(file.originalname)}`
        callback(null, filename);
    }
});

export const singleUpload = multer({storage}).single("photo");
