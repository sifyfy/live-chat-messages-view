(() => {
    const App = {
        ws: null,
        lastMessageDateTime: new Date(), // 配信開始日時を初期値として持たないとViewerのリロード時に過去コメントを表示出来なくなるが、その様な厳密な対応は今の仕組みでは難しいのでJS実行日時とする。
        debug: false,
    };

    function debug_log(x) {
        if (App.debug) {
            console.log(x);
        }
    }

    function initLiveChatMessageWebSocketServer() {
        App.ws = new WebSocket("ws://localhost:51021");

        App.ws.addEventListener("open", () => console.log('Connected to WS server!'));

        App.ws.addEventListener("close", () => {
            setTimeout(initLiveChatMessageWebSocketServer, 5000);
        });

        App.ws.addEventListener("message", e => {
            debug_log(e.data);

            const comment = JSON.parse(e.data);

            debug_log(comment);

            if (comment.type === "System") {
                return;
            }

            const messageDateTime = new Date(comment.date_time);
            if (messageDateTime <= App.lastMessageDateTime) {
                return;
            }
            App.lastMessageDateTime = messageDateTime;

            const template = document.querySelector("#comment-template");
            const newCommentFrame = template.content.cloneNode(true);
            const userName = newCommentFrame.querySelector(".user-name > span");
            userName.textContent = comment.user_data.name;
            const newComment = newCommentFrame.querySelector(".comment");

            // 名前欄の背景処理
            switch (comment.stream_data.service_type) {
                case 'YoutubeLive':
                    userName.classList.add("youtube");
                    break;
                case 'Twitch':
                    userName.classList.add("twitch");
                    break;
                default:
            }

            // チャットメッセージ処理
            let lastIndex = 0;
            if (comment.stamp_data_list == null || comment.stamp_data_list.length === 0) {
                newComment.textContent = comment.comment;
            } else if (comment.comment == null) {
                let html_comment = '';
                for (const stamp of comment.stamp_data_list) {
                    html_comment += `<img src="file:///${stamp.url}" width="${stamp.width}" height="${stamp.height}">`;
                }
                newComment.innerHTML = html_comment;
            } else {
                for (const stamp of comment.stamp_data_list) {
                    const text = document.createTextNode(comment.comment.slice(lastIndex, stamp.start));
                    newComment.appendChild(text);

                    const img = document.createElement("img");
                    img.setAttribute("src", `file:///${stamp.url}`);
                    img.setAttribute("width", `${stamp.width}`);
                    img.setAttribute("height", `${stamp.height}`);
                    newComment.appendChild(img);

                    lastIndex = stamp.end < comment.comment.length ? stamp.end + 1 : stamp.end;
                }

                const remainText = document.createTextNode(comment.comment.slice(lastIndex));
                newComment.appendChild(remainText);
            }

            const commentList = document.querySelector("#comments");
            commentList.appendChild(newCommentFrame);
        });

        App.ws.addEventListener("error", e => console.error("WebSocket Error: ", e));
    }

    initLiveChatMessageWebSocketServer();
})();