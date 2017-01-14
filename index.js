const exec = require('child_process').exec
const Q = require('bluebird')
const fs = require('fs')
const colors = require('colors')
const path = require('path')

const UNSUPPORTED_YOUTUBE_CODECS = ['hevc']
const P = (() => {

      let padTo = number => number <= 999999 ? ("00000" + number).slice(-6) : number;

      let _renameFile = string => {
        let _new = string.replace(/ /g, "_");
        fs.renameSync(string, _new)
        return _new
      }

      let _fixExtensionsForYoutube = (ext) => {
        if (ext === '.mkv') {
          ext = '.mp4'
        }
        return ext
      }

      let _setVideoCodec = (options, out) => {
        let _copyC = ' -c:v copy '
        if (options.youtubeUpload) {
          let _videoStreamCodec = out.streams[0].codec_name
            //oops
          if (UNSUPPORTED_YOUTUBE_CODECS.indexOf(_videoStreamCodec) > -1) {
            return ' -c:v libx264 '
          } else {
            return _copyC
          }
        } else {
          return _copyC
        }
      }

      function _getStartAndEnds(dur, min, max) {
        let _d = 0
        let times = []
        while (_d < dur) {
          let _r = Math.floor(Math.random() * (max - min + 1) + min)
          if ((_d + _r) > dur) {
            _r = dur - _d
          }
          times.push([_d, _r])
          _d += _r
        }
        return times
      }

      function _duration(filePath) {
        return new Promise((yes, no) => {
          var _c = `ffprobe -v quiet -of json -show_format  -show_streams -i \"${filePath}\"`;
          console.log(colors.yellow(`${_c}`));
          let _cmd = exec(_c, (code, stdout, stderr) => {
            let _out = JSON.parse(stdout)
            if (!_out.format) {
              no(new Error('Something wrong with file'))
              return
            }
            yes({ duration: _out.format.duration, out: _out })
          });
        })
      }

      function _split(filePath, start, end, outFile, options, out) {
        return new Promise((yes, no) => {
          let _optM = options.removeMetadata ? `-map_metadata -1 ` : ''
          _optM += options.removeSubtitles ? ' -sn ' : ''
          let _videoCodec = _setVideoCodec(options, out)
          var _c = `ffmpeg -ss ${start} -i \"${filePath}\" -t ${end} ${_videoCodec} -c:a copy ${_optM} -y \"${outFile}\"`
          //bad because the times will be wrong
          if (options.noOverwrite && fs.existsSync(outFile)) {
            console.log(colors.yellow(`Exists: ${outFile}`));
            yes(outFile)
          } else {
            console.log(colors.yellow(`${_c}`));
            let _cmd = exec(_c, (code, stdout, stderr) => {
              console.log(colors.green(`\t${outFile}`));
              yes(outFile)
            });
          }
        })
      }

      function _generateReport(filePath, outFiles, times) {
        let _name = path.parse(filePath).name
        return {
          name: _name,
          sectionTimes: times.map(time => {
            //time[1] is a duration
            return [time[0], time[0] + time[1]]
          }),
          files: [...outFiles]
        }
      }

      /*
      {
        removeMetadata: map_metadata -1
      }
      */
      function split(filePath, min, max, outDir = __dirname, options = {}) {
        let _ext = path.parse(filePath).ext
        if (options.youtubeUpload) {
          _ext = _fixExtensionsForYoutube(_ext)
        }
        let _name = path.parse(filePath).name
        console.log(colors.blue(`Input: ${filePath}`));
        return new Promise((yes, no) => {
              _duration(filePath).then(data => {
                    let { duration, out } = data
                    let times = _getStartAndEnds(duration, min, max)
                    return Q.map(times, ((vals, i) => {
                            let _p = padTo(i)
                            let _outFile = `${path.join(outDir, `${_name}`)}${_p}${_ext}`
          return _split(filePath, vals[0], vals[1], _outFile, options, out)

        }), { concurrency: 1 })
                    .then((outFiles)=>{
            return yes(_generateReport(filePath, outFiles, times))
        })
      })

    })
  }

  return {
    split: split,
  }

})()

module.exports = P