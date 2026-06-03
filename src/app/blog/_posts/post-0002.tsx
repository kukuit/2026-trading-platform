import Image from 'next/image'
import Link from 'next/link'

export default function Post0002() {
  return (
    <>
      <h2 className="mt-4">Cam hữu cơ khác cam thường ở điểm nào?</h2>

      <p className="mt-4">
        Khác biệt lớn nhất không nằm ở “vỏ đẹp hay không”, mà nằm ở{' '}
        <b className="italic">cách làm vườn</b>. Cam hữu cơ ưu tiên nuôi đất – giữ cân bằng hệ sinh
        thái để cây tự khoẻ, từ đó trái có mùi thơm tự nhiên và chất lượng đi theo mùa.
      </p>

      {/* Ảnh 1 */}
      <div className="mt-4 overflow-hidden rounded-xl border">
        <Image
          src="/images/blogs/post-0002/cham-dat.jpg"
          alt="Chăm đất trong canh tác hữu cơ"
          width={1200}
          height={675}
          className="w-full h-auto"
        />
      </div>

      <p className="mt-4">
        Nếu bạn muốn phân biệt nhanh, hãy nhìn theo 3 lớp:{' '}
        <b className="italic">đất – cách chăm – trải nghiệm khi ăn</b>. Dưới đây là những điểm khác
        nhau dễ hiểu nhất:
      </p>

      <ul className="mt-4 space-y-2 list-disc pl-5">
        <li>
          <b className="italic">Cách chăm vườn:</b> hữu cơ tập trung nuôi đất, tăng vi sinh có lợi,
          cây khoẻ bền; cam thường dễ thiên về “xử lý nhanh” để đạt sản lượng và hình thức.
        </li>
        <li>
          <b className="italic">Mức độ can thiệp hoá học:</b> hữu cơ hạn chế tối đa thuốc/phân hoá
          học, ưu tiên giải pháp sinh học; cam thường có thể phụ thuộc nhiều hơn vào can thiệp.
        </li>
        <li>
          <b className="italic">Trái theo mùa:</b> cam hữu cơ thường thơm, vị đậm và có thể khác nhẹ
          giữa từng đợt; cam thường đồng đều hơn do quy trình tác động mạnh.
        </li>
        <li>
          <b className="italic">Minh bạch quy trình:</b> vườn hữu cơ hay có nhật ký chăm sóc rõ ràng
          để người mua kiểm chứng; cam thường ít khi công khai chi tiết.
        </li>
      </ul>

      {/* Ảnh 2 */}
      <div className="mt-4 overflow-hidden rounded-xl border">
        <Image
          src="/images/blogs/post-0002/vuon-cam.jpg"
          alt="Vườn cam theo hướng hữu cơ"
          width={1200}
          height={675}
          className="w-full h-auto"
        />
      </div>

      <p className="mt-4">
        Khi chọn mua, bạn có thể ưu tiên trái cầm chắc tay, thơm nhẹ tự nhiên. Nếu có thể, hãy hỏi
        thêm về thời điểm thu hoạch và cách chăm vườn — đây thường là dấu hiệu rõ nhất của một vườn
        làm nghiêm túc.
      </p>

      {/* Ảnh 3 */}
      <div className="mt-4 overflow-hidden rounded-xl border">
        <Image
          src="/images/blogs/post-0002/can-canh-trai.jpg"
          alt="Cận cảnh trái cam theo mùa"
          width={1200}
          height={675}
          className="w-full h-auto"
        />
      </div>

      <p className="mt-4">
        Xem thêm:{' '}
        <Link
          href="/blog/vitamin-c-trong-cam-sanh-loi-ich-va-cach-dung-dung"
          className="text-orange-600 hover:underline"
        >
          Vitamin C trong cam sành: lợi ích &amp; cách dùng đúng
        </Link>
      </p>
    </>
  )
}
