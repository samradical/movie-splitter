let s = require('./index')

s.split('/Volumes/Fatboy/_Usenet/aaf-rocky.and.bullwinkle.and.friends.s03e04.avi',
  13, //min time seconds
  15, // max time seconds
  path.join(__dirname, '_out'), //out dir
  {
    noOverwrite: false, //if the clip exists already to you dont have to split
    removeMetadata: true,
    removeSubtitles: true,
    youtubeUpload: true //mkv to mp4
  }
).
then(report => {
  console.log(report);
})
