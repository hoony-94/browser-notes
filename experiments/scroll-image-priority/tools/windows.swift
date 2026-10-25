// 화면에 보이는 창 목록을 "창번호<TAB>프로세스<TAB>x,y,너비,높이<TAB>앱<TAB>제목"으로 출력한다.
// DevTools 캡처에서 실험용 Chrome 창만 골라 screencapture -l로 찍기 위해 쓴다.
import CoreGraphics
import Foundation

let options = CGWindowListOption(arrayLiteral: .optionOnScreenOnly, .excludeDesktopElements)
let windows = CGWindowListCopyWindowInfo(options, kCGNullWindowID) as? [[String: Any]] ?? []
for window in windows where (window[kCGWindowLayer as String] as? Int) == 0 {
  let id = window[kCGWindowNumber as String] as? Int ?? 0
  let pid = window[kCGWindowOwnerPID as String] as? Int ?? 0
  let owner = window[kCGWindowOwnerName as String] as? String ?? ""
  let name = window[kCGWindowName as String] as? String ?? ""
  let bounds = window[kCGWindowBounds as String] as? [String: Double] ?? [:]
  let rect = ["X", "Y", "Width", "Height"].map { String(Int(bounds[$0] ?? 0)) }.joined(separator: ",")
  print("\(id)\t\(pid)\t\(rect)\t\(owner)\t\(name)")
}
