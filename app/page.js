import Header from "./components/header";
import Trending from "./sections/trending";

export default function Home() {
  return (
    <>

      <div className="py-8 xl:px-24 px-4 text-white font-semibold text-2xl">
        <Trending />

      </div>
    </>
  )
}