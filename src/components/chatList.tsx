import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const ChatList = () => {
  const chats = [
    {
      id: 1,
      name: "Alice Johnson",
      message: "Hey, are we still on for tonight?",
      messageType: "double-tick",
      time: "09:12",
      avatar: "",
    },
    {
      id: 2,
      name: "Project Team",
      message: "Shared a new design mockup",
      messageType: "image",
      time: "08:47",
      avatar: "https://via.placeholder.com/40",
    },
    {
      id: 3,
      name: "DevOps Bot",
      message: "Deployment succeeded ✅",
      messageType: "double-tick",
      time: "Yesterday",
      avatar: "https://via.placeholder.com/40",
    },
    {
      id: 4,
      name: "Mom",
      message: "Call me when free.",
      time: "Yesterday",
      avatar: "https://via.placeholder.com/40",
    },
    {
      id: 5,
      name: "Movie Night",
      message: "That trailer was amazing!",
      messageType: "video",
      time: "Sat",
      avatar: "https://via.placeholder.com/40",
    },
  ];

  return (
    <div className="flex w-full flex-col gap-2">
      {chats.map((chat) => (
        <div
          key={chat.id}
          className=" w-full flex items-center p-3 cursor-pointer hover:bg-[var(--wa-secondary)] rounded-2xl"
        >
          {/* Avatar */}
          <Avatar className="size-11">
            <AvatarImage src={chat.avatar} />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>

          {/* Chat info */}
          <div className="flex-1 ml-4 min-w-0">
            <div className="flex justify-between items-center">
              <h4 className="font-medium text-gray-900 truncate">
                {chat.name}
              </h4>
              <span className="text-xs text-gray-500">{chat.time}</span>
            </div>
            <div className="flex items-center text-sm text-gray-600 truncate">
              {chat.messageType === "image" && <span className="mr-1">🖼</span>}
              {chat.messageType === "video" && <span className="mr-1">🎥</span>}
              {chat.messageType === "double-tick" && (
                <span className="text-blue-500 mr-1">✔✔</span>
              )}
              <span className="truncate">{chat.message}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ChatList;
