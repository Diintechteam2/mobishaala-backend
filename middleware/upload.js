import multer from 'multer';

// Configure multer to store files in memory
const storage = multer.memoryStorage();

// File filter - only allow images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

export const uploadFields = upload.fields([
  { name: 'businessLogo', maxCount: 1 },
  { name: 'instituteImage', maxCount: 1 },
  { name: 'backgroundImage', maxCount: 1 },
  { name: 'courseImage', maxCount: 1 },
]);

// For multiple course images
export const uploadCourseImage = upload.single('courseImage');

export default upload;

